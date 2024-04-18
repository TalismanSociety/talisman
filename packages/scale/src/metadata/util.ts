import * as $ from "@talismn/subshape-fork"

import { MetadataV14 } from "../capi"
import log from "../log"

export type TyMV14 = MetadataV14["tys"][0]
export type PalletMV14 = MetadataV14["pallets"][0]
export type StorageEntryMV14 = NonNullable<PalletMV14["storage"]>["entries"][0]

export const getMetadataVersion = (metadataRpc: `0x${string}`) => {
  // https://docs.substrate.io/build/application-development/#metadata-system
  const magicNumber = 1635018093

  const { version } = $.object(
    $.field("magicNumber", $.constant<typeof magicNumber>(magicNumber, $.u32)),
    $.field("version", $.u8)
  ).decode($.decodeHex(metadataRpc))

  return version
}

export const filterMetadataPalletsAndItems = (
  metadata: MetadataV14,
  palletsAndItems: Array<{
    pallet: (pallet: PalletMV14) => boolean
    items: Array<(item: StorageEntryMV14) => boolean>
  }>,
  extraKeepTypes?: number[]
) => {
  // remove pallets we don't care about
  metadata.pallets = metadata.pallets.filter((pallet) =>
    // keep this pallet if it's listed in `palletsAndItems`
    palletsAndItems.some(({ pallet: palletFilter }) => palletFilter(pallet))
  )

  // remove fields we don't care about from each pallet, and extract types for each storage item we care about
  const items = palletsAndItems.flatMap(({ pallet: palletFilter, items }) => {
    const pallet = metadata.pallets.find(palletFilter)
    if (!pallet) {
      log.debug("Failed to find pallet", palletFilter)
      return []
    }

    // remove fields we don't care about
    pallet.calls = undefined
    pallet.constants = []
    pallet.error = undefined
    pallet.event = undefined

    if (!pallet.storage) return []

    // filter and extract storage items we care about
    pallet.storage.entries = pallet.storage.entries.filter((item) =>
      items.some((itemFilter) => itemFilter(item))
    )

    return pallet.storage.entries
  })

  // this is a set of type ids which we plan to keep in our mutated metadata
  // anything not in this set will be deleted
  // we start off with just the types of the state calls we plan to make,
  // then we run those types through a function (addDependentTypes) which will also include
  // all of the types which those types depend on - recursively
  const keepTypes = new Set(
    items
      .flatMap((item) => [
        // each type can be either "Plain" or "Map"
        // if it's "Plain" we only need to get the value type
        // if it's a "Map" we want to keep both the key AND the value types
        item.type === "Map" && item.key,
        item.value,
      ])
      .filter((type): type is number => typeof type === "number")
  )
  extraKeepTypes?.forEach((type) => keepTypes.add(type))

  // recursively find all the types which our keepTypes depend on and add them to the keepTypes set
  const metadataTysMap = new Map(metadata.tys.map((ty) => [ty.id, ty]))
  addDependentTypes(metadataTysMap, keepTypes, [...keepTypes])

  // ditch the types we aren't keeping
  metadata.tys = metadata.tys.filter((type) => keepTypes.has(type.id))

  // update all type ids to be sequential (fill the gaps left by the deleted types)
  const newTypeIds = new Map<number, number>()
  metadata.tys.forEach((ty, index) => newTypeIds.set(ty.id, index))
  const getNewTypeId = (oldTypeId: number): number => {
    const newTypeId = newTypeIds.get(oldTypeId)
    if (typeof newTypeId !== "number") log.error(`Failed to find newTypeId for type ${oldTypeId}`)
    return newTypeId ?? 0
  }
  remapTypeIds(metadata, getNewTypeId)
}

export const addDependentTypes = (
  metadataTysMap: Map<TyMV14["id"], TyMV14>,
  keepTypes: Set<number>,
  types: number[],
  // Prevent stack overflow when a type references itself
  addedTypes: Set<number> = new Set()
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
      .map((param) => param.ty)
      .filter((type): type is number => typeof type === "number")
    addDependentSubTypes(paramTypes)

    switch (type.type) {
      case "SizedArray":
        addDependentSubTypes([type.typeParam])
        break

      case "BitSequence":
        addDependentSubTypes([type.bitOrderType, type.bitStoreType])
        break

      case "Compact":
        addDependentSubTypes([type.typeParam])
        break

      case "Struct":
        addDependentSubTypes(
          type.fields.map((field) => field.ty).filter((ty): ty is number => typeof ty === "number")
        )
        break

      case "Primitive":
        break

      case "Sequence":
        addDependentSubTypes([type.typeParam])
        break

      case "Tuple":
        addDependentSubTypes(type.fields.filter((ty): ty is number => typeof ty === "number"))
        break

      case "Union":
        addDependentSubTypes(
          type.members
            .flatMap((member) => member.fields.map((field) => field.ty))
            .filter((ty): ty is number => typeof ty === "number")
        )
        break

      default: {
        // force compilation error if any types don't have a case
        const exhaustiveCheck: never = type
        log.error(`Unhandled TyMV14 type ${exhaustiveCheck}`)
      }
    }
  }
}

const remapTypeIds = (metadata: MetadataV14, getNewTypeId: (oldTypeId: number) => number) => {
  remapLookupTypeIds(metadata, getNewTypeId)
  remapStorageTypeIds(metadata, getNewTypeId)
}

const remapLookupTypeIds = (metadata: MetadataV14, getNewTypeId: (oldTypeId: number) => number) => {
  for (const type of metadata.tys) {
    type.id = getNewTypeId(type.id)

    for (const param of type.params) {
      if (typeof param.ty !== "number") continue
      param.ty = getNewTypeId(param.ty)
    }

    switch (type.type) {
      case "SizedArray":
        type.typeParam = getNewTypeId(type.typeParam)
        break

      case "BitSequence":
        type.bitOrderType = getNewTypeId(type.bitOrderType)
        type.bitStoreType = getNewTypeId(type.bitStoreType)
        break

      case "Compact":
        type.typeParam = getNewTypeId(type.typeParam)
        break

      case "Struct":
        for (const field of type.fields) {
          if (typeof field.ty !== "number") continue
          field.ty = getNewTypeId(field.ty)
        }
        break

      case "Primitive":
        break

      case "Sequence":
        type.typeParam = getNewTypeId(type.typeParam)
        break

      case "Tuple":
        type.fields = type.fields.map((ty) => {
          if (typeof ty !== "number") return ty
          return getNewTypeId(ty)
        })
        break

      case "Union":
        for (const member of type.members) {
          for (const field of member.fields) {
            if (typeof field.ty !== "number") continue
            field.ty = getNewTypeId(field.ty)
          }
        }
        break

      default: {
        // force compilation error if any types don't have a case
        const exhaustiveCheck: never = type
        log.error(`Unhandled TyMV14 type ${exhaustiveCheck}`)
      }
    }
  }
}
const remapStorageTypeIds = (
  metadata: MetadataV14,
  getNewTypeId: (oldTypeId: number) => number
) => {
  for (const pallet of metadata.pallets) {
    for (const item of pallet.storage?.entries ?? []) {
      if (item.type === "Plain") item.value = getNewTypeId(item.value)
      if (item.type === "Map") {
        item.key = getNewTypeId(item.key)
        item.value = getNewTypeId(item.value)
      }
    }
  }
}
