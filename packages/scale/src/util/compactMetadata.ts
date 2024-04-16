import log from "../log"
import { V14, V15 } from "../scale-ts/metadata"

export type V14Type = V14["lookup"][0]
export type V14Pallet = V14["pallets"][0]
export type V14StorageItem = NonNullable<V14Pallet["storage"]>["items"][0]

export type V15Type = V15["lookup"][0]
export type V15Pallet = V15["pallets"][0]
export type V15StorageItem = NonNullable<V15Pallet["storage"]>["items"][0]

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
  metadata: V15,
  palletsAndItems: Array<{
    pallet: string
    items: string[]
  }>,
  //   metadata: V15 | V14,
  //   palletsAndItems: Array<{
  //     pallet: (pallet: V15Pallet | V14Pallet) => boolean
  //     items: Array<(item: V15StorageItem | V14StorageItem) => boolean>
  //   }>,
  extraKeepTypes?: number[]
) => {
  // remove pallets we don't care about
  metadata.pallets = metadata.pallets.filter((pallet) =>
    // keep this pallet if it's listed in `palletsAndItems`
    palletsAndItems.some(({ pallet: palletName }) => pallet.name === palletName)
  )

  // remove fields we don't care about from each pallet, and extract types for each storage item we care about
  const items = palletsAndItems.flatMap(({ pallet: palletName, items: itemNames }) => {
    const pallet = metadata.pallets.find((pallet) => pallet.name === palletName)
    if (!pallet) {
      log.debug("Failed to find pallet", palletName)
      return []
    }

    // remove pallet fields we don't care about
    pallet.calls = undefined
    pallet.constants = []
    if ("docs" in pallet) pallet.docs = []
    pallet.errors = undefined
    pallet.events = undefined

    if (!pallet.storage) return []

    // filter and extract storage items we care about
    pallet.storage.items = pallet.storage.items.filter((item) =>
      itemNames.some((itemName) => item.name === itemName)
    )

    return pallet.storage.items
  })

  // this is a set of type ids which we plan to keep in our compacted metadata
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
        item.type.tag === "map" && item.type.value.key,
        item.type.tag === "map" && item.type.value.value,
        item.type.value,
      ])
      .filter((type): type is number => typeof type === "number")
  )
  extraKeepTypes?.forEach((type) => keepTypes.add(type))

  // recursively find all the types which our keepTypes depend on and add them to the keepTypes set
  const metadataTysMap = new Map(metadata.lookup.map((ty) => [ty.id, ty]))
  addDependentTypes(metadataTysMap, keepTypes, [...keepTypes])

  // ditch the types we aren't keeping
  metadata.lookup = metadata.lookup.filter((type) => keepTypes.has(type.id))

  // ditch the remaining data we don't need to keep in a miniMetata
  metadata.apis = []
  metadata.extrinsic.address = 0
  metadata.extrinsic.call = 0
  metadata.extrinsic.extra = 0
  metadata.extrinsic.signature = 0
  metadata.extrinsic.signature = 0
  metadata.extrinsic.signedExtensions = []
  metadata.outerEnums.call = 0
  metadata.outerEnums.error = 0
  metadata.outerEnums.event = 0
}

const addDependentTypes = (
  metadataTysMap: Map<V15Type["id"], V15Type>,
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

    switch (type.def.tag) {
      case "array":
        addDependentSubTypes([
          ...type.params
            .map((param) => param.type)
            .filter((ty): ty is number => typeof ty === "number"),
          type.def.value.type,
        ])
        break

      case "bitSequence":
        addDependentSubTypes([type.def.value.bitOrderType, type.def.value.bitStoreType])
        break

      case "compact":
        addDependentSubTypes([
          ...type.params
            .map((param) => param.type)
            .filter((ty): ty is number => typeof ty === "number"),
          type.def.value,
        ])
        break

      case "composite":
        addDependentSubTypes([
          ...type.params
            .map((param) => param.type)
            .filter((ty): ty is number => typeof ty === "number"),
          ...type.def.value
            .map((field) => field.type)
            .filter((ty): ty is number => typeof ty === "number"),
        ])
        break

      case "primitive":
        addDependentSubTypes([
          ...type.params
            .map((param) => param.type)
            .filter((ty): ty is number => typeof ty === "number"),
        ])
        break

      case "sequence":
        addDependentSubTypes([
          ...type.params
            .map((param) => param.type)
            .filter((ty): ty is number => typeof ty === "number"),
          type.def.value,
        ])
        break

      case "tuple":
        addDependentSubTypes([
          ...type.params
            .map((param) => param.type)
            .filter((ty): ty is number => typeof ty === "number"),
          ...type.def.value.filter((ty): ty is number => typeof ty === "number"),
        ])
        break

      case "variant":
        addDependentSubTypes([
          ...type.params
            .map((param) => param.type)
            .filter((ty): ty is number => typeof ty === "number"),
          ...type.def.value
            .flatMap((member) => member.fields.map((field) => field.type))
            .filter((ty): ty is number => typeof ty === "number"),
        ])
        break

      default: {
        // force compilation error if any types don't have a case
        const exhaustiveCheck: never = type.def
        log.error(`Unhandled V15Type type ${exhaustiveCheck}`)
      }
    }
  }
}
