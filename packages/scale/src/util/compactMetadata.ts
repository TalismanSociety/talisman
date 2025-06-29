import { Metadata } from "@polkadot-api/substrate-bindings"

import log from "../log"
import { Prettify } from "./Prettify"

export type MetadataType = SupportedMetadata["lookup"][number]
export type MetadataPallet = SupportedMetadata["pallets"][number]
export type MetadataStorageItem = NonNullable<MetadataPallet["storage"]>["items"][number]

type SupportedMetadata = Extract<Metadata["metadata"], { tag: SupportedMetadataVersion }>["value"]
type SupportedMetadataVersion = "v14" | "v15" | "v16"

/**
 * Converts a `Metadata` into a `MiniMetadata`.
 *
 * A `MiniMetadata` only contains the types inside of its `lookup` which are relevant for
 * the storage queries specified in `palletsAndItems`.
 *
 * E.g. if `palletsAndItems` is `{ pallet: "System", items: ["Account"] }`, then only the
 * types used in the `System.Account` storage query will remain inside of metadata.lookups.
 */
export const compactMetadata = (
  anyMetadata: Metadata,
  palletsAndItems: Array<{ pallet: string; constants?: string[]; items: string[] }> = [],
  runtimeApisAndMethods: Array<{ runtimeApi: string; methods: string[] }> = [],
  extraKeepTypes: number[] = [],
) => {
  if (!isCompactableMetadata(anyMetadata))
    throw new Error(`Metadata version ${anyMetadata.metadata.tag} not supported in compactMetadata`)

  const metadata: SupportedMetadata = anyMetadata.metadata.value

  // remove pallets we don't care about
  metadata.pallets = metadata.pallets.filter((pallet) =>
    // keep this pallet if it's listed in `palletsAndItems`
    palletsAndItems.some(({ pallet: palletName }) => pallet.name === palletName),
  ) as typeof metadata.pallets

  // remove fields we don't care about from each pallet, and extract types for each storage item we care about
  const palletsKeepTypes = palletsAndItems.flatMap(
    ({ pallet: palletName, constants: constantNames, items: itemNames }) => {
      const pallet = metadata.pallets.find((pallet) => pallet.name === palletName)
      if (!pallet) return []

      // remove pallet fields we don't care about
      pallet.calls = undefined
      pallet.constants = constantNames
        ? pallet.constants.filter((constant) => constantNames.includes(constant.name))
        : []
      // v15 (NOT v14) has docs
      if ("docs" in pallet) pallet.docs = []
      pallet.errors = undefined
      pallet.events = undefined

      if (!pallet.storage) return []

      // filter and extract storage items we care about
      pallet.storage.items = pallet.storage.items.filter((item) =>
        itemNames.some((itemName) => item.name === itemName),
      )

      return [
        ...pallet.storage.items
          .flatMap((item) => [
            // each type can be either "Plain" or "Map"
            // if it's "Plain" we only need to get the value type
            // if it's a "Map" we want to keep both the key AND the value types
            item.type.tag === "plain" && item.type.value,
            item.type.tag === "map" && item.type.value.key,
            item.type.tag === "map" && item.type.value.value,
          ])
          .filter((type): type is number => typeof type === "number"),
        ...pallet.constants.flatMap((constant) => constant.type),
      ]
    },
  )

  // remove runtime apis we don't care about
  let runtimeApisKeepTypes: number[] = []
  if ("apis" in metadata) {
    // metadata is v15 (NOT v14)

    // keep this api if it's listed in `runtimeApisAndMethods`
    metadata.apis = metadata.apis.filter((runtimeApi) =>
      runtimeApisAndMethods.some(
        ({ runtimeApi: runtimeApiName }) => runtimeApi.name === runtimeApiName,
      ),
    )

    // remove methods we don't care about from each runtime api, and extract types for each call's params and result
    runtimeApisKeepTypes = runtimeApisAndMethods.flatMap(
      ({ runtimeApi: runtimeApiName, methods: methodNames }) => {
        const runtimeApi = metadata.apis.find((runtimeApi) => runtimeApi.name === runtimeApiName)
        if (!runtimeApi) return []

        // remove runtime fields we don't care about
        runtimeApi.docs = []

        if (!runtimeApi.methods) return []

        // filter and extract methods we care about
        runtimeApi.methods = runtimeApi.methods.filter((method) =>
          methodNames.some((methodName) => method.name === methodName),
        )

        return runtimeApi.methods.flatMap((method) => [
          // each method has an array of input types (for the params)
          ...method.inputs.map((input) => input.type),
          // and one output type (for the result)
          method.output,
        ])
      },
    )
  }

  // this is a set of type ids which we plan to keep in our compacted metadata
  // anything not in this set will be deleted
  // we start off with just the types of the state calls we plan to make,
  // then we run those types through a function (addDependentTypes) which will also include
  // all of the types which those types depend on - recursively
  const keepTypes = new Set([...palletsKeepTypes, ...runtimeApisKeepTypes])
  extraKeepTypes?.forEach((type) => keepTypes.add(type))

  // recursively find all the types which our keepTypes depend on and add them to the keepTypes set
  const metadataTysMap = new Map(metadata.lookup.map((ty) => [ty.id, ty]))
  addDependentTypes(metadataTysMap, keepTypes, [...keepTypes])

  // ditch the types we aren't keeping
  metadata.lookup = metadata.lookup.filter((type) => keepTypes.has(type.id))

  // update all type ids to be sequential (fill the gaps left by the deleted types)
  const newTypeIds = new Map<number, number>()
  metadata.lookup.forEach((type, index) => newTypeIds.set(type.id, index))
  const getNewTypeId = (oldTypeId: number): number => {
    const newTypeId = newTypeIds.get(oldTypeId)
    if (typeof newTypeId !== "number") log.error(`Failed to find newTypeId for type ${oldTypeId}`)
    return newTypeId ?? 0
  }
  remapTypeIds(metadata, getNewTypeId)

  if ("address" in metadata.extrinsic) metadata.extrinsic.address = 0
  if ("call" in metadata.extrinsic) metadata.extrinsic.call = 0
  if ("signature" in metadata.extrinsic) metadata.extrinsic.signature = 0
  if ("extra" in metadata.extrinsic) metadata.extrinsic.extra = 0
  if ("signedExtensions" in metadata.extrinsic) metadata.extrinsic.signedExtensions = []
  if ("outerEnums" in metadata) {
    // metadata is v15 (NOT v14)
    metadata.outerEnums.call = 0
    metadata.outerEnums.error = 0
    metadata.outerEnums.event = 0
  }
}

type CompactableMetadata = Prettify<
  Omit<Metadata, "metadata"> & {
    metadata: Extract<Metadata["metadata"], { tag: SupportedMetadataVersion }>
  }
>
const isCompactableMetadata = (metadata: Metadata): metadata is CompactableMetadata => {
  switch (metadata.metadata.tag) {
    case "v14":
    case "v15":
    case "v16":
      return true
    default:
      return false
  }
}

const addDependentTypes = (
  metadataTysMap: Map<MetadataType["id"], MetadataType>,
  keepTypes: Set<number>,
  types: number[],
  // Prevent stack overflow when a type references itself
  addedTypes: Set<number> = new Set(),
) => {
  const addDependentSubTypes = (subTypes: number[]) =>
    addDependentTypes(metadataTysMap, keepTypes, subTypes, addedTypes)

  for (const typeId of types) {
    const type = metadataTysMap.get(typeId)
    if (!type) {
      log.warn(`Unable to find type with id ${typeId}`)
      continue
    }

    if (addedTypes.has(type.id)) continue
    keepTypes.add(type.id)
    addedTypes.add(type.id)

    const paramTypes = type.params
      .map((param) => param.type)
      .filter((type): type is number => typeof type === "number")
    addDependentSubTypes(paramTypes)

    switch (type.def.tag) {
      case "array":
        addDependentSubTypes([type.def.value.type])
        break

      case "bitSequence":
        addDependentSubTypes([type.def.value.bitOrderType, type.def.value.bitStoreType])
        break

      case "compact":
        addDependentSubTypes([type.def.value])
        break

      case "composite":
        addDependentSubTypes(
          type.def.value
            .map((field) => field.type)
            .filter((type): type is number => typeof type === "number"),
        )
        break

      case "primitive":
        break

      case "sequence":
        addDependentSubTypes([type.def.value])
        break

      case "tuple":
        addDependentSubTypes(
          type.def.value.filter((type): type is number => typeof type === "number"),
        )
        break

      case "variant":
        addDependentSubTypes(
          type.def.value
            .flatMap((member) => member.fields.map((field) => field.type))
            .filter((type): type is number => typeof type === "number"),
        )
        break

      default: {
        // force compilation error if any types don't have a case
        const exhaustiveCheck: never = type.def
        log.error(`Unhandled V15Type type ${exhaustiveCheck}`)
      }
    }
  }
}

const remapTypeIds = (metadata: SupportedMetadata, getNewTypeId: (oldTypeId: number) => number) => {
  remapLookupTypeIds(metadata, getNewTypeId)
  remapStorageTypeIds(metadata, getNewTypeId)
  remapRuntimeApisTypeIds(metadata, getNewTypeId)
}

const remapLookupTypeIds = (
  metadata: SupportedMetadata,
  getNewTypeId: (oldTypeId: number) => number,
) => {
  for (const type of metadata.lookup) {
    type.id = getNewTypeId(type.id)

    for (const param of type.params) {
      if (typeof param.type !== "number") continue
      param.type = getNewTypeId(param.type)
    }

    switch (type.def.tag) {
      case "array":
        type.def.value.type = getNewTypeId(type.def.value.type)
        break

      case "bitSequence":
        type.def.value.bitOrderType = getNewTypeId(type.def.value.bitOrderType)
        type.def.value.bitStoreType = getNewTypeId(type.def.value.bitStoreType)
        break

      case "compact":
        type.def.value = getNewTypeId(type.def.value)
        break

      case "composite":
        for (const field of type.def.value) {
          if (typeof field.type !== "number") continue
          field.type = getNewTypeId(field.type)
        }
        break

      case "primitive":
        break

      case "sequence":
        type.def.value = getNewTypeId(type.def.value)
        break

      case "tuple":
        type.def.value = type.def.value.map((type) => {
          if (typeof type !== "number") return type
          return getNewTypeId(type)
        })
        break

      case "variant":
        for (const member of type.def.value) {
          for (const field of member.fields) {
            if (typeof field.type !== "number") continue
            field.type = getNewTypeId(field.type)
          }
        }
        break

      default: {
        // force compilation error if any types don't have a case
        const exhaustiveCheck: never = type.def
        log.error(`Unhandled V15Type type ${exhaustiveCheck}`)
      }
    }
  }
}

const remapStorageTypeIds = (
  metadata: SupportedMetadata,
  getNewTypeId: (oldTypeId: number) => number,
) => {
  for (const pallet of metadata.pallets) {
    for (const item of pallet.storage?.items ?? []) {
      if (item.type.tag === "plain") item.type.value = getNewTypeId(item.type.value)
      if (item.type.tag === "map") {
        item.type.value.key = getNewTypeId(item.type.value.key)
        item.type.value.value = getNewTypeId(item.type.value.value)
      }
    }
    for (const constant of pallet.constants ?? []) {
      constant.type = getNewTypeId(constant.type)
    }
  }
}

const remapRuntimeApisTypeIds = (
  metadata: SupportedMetadata,
  getNewTypeId: (oldTypeId: number) => number,
) => {
  for (const runtimeApi of metadata.apis) {
    for (const method of runtimeApi.methods ?? []) {
      for (const input of method.inputs) {
        input.type = getNewTypeId(input.type)
      }
      method.output = getNewTypeId(method.output)
    }
  }
}
