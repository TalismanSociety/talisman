import type {
  Metadata,
  Metadata_V14,
  PalletMetadataV14,
  PortableTypeV14,
  StorageEntryMetadataV14,
} from "@subsquid/substrate-metadata"

import log from "./log"

export const metadataIsV14 = (metadata: Metadata): metadata is Metadata_V14 => {
  if (
    metadata.__kind === "V0" ||
    metadata.__kind === "V1" ||
    metadata.__kind === "V2" ||
    metadata.__kind === "V3" ||
    metadata.__kind === "V4" ||
    metadata.__kind === "V5" ||
    metadata.__kind === "V6" ||
    metadata.__kind === "V7" ||
    metadata.__kind === "V8" ||
    metadata.__kind === "V9" ||
    metadata.__kind === "V10" ||
    metadata.__kind === "V11" ||
    metadata.__kind === "V12" ||
    metadata.__kind === "V13"
  ) {
    // we can't parse metadata < v14
    //
    // as of v14 the type information required to interact with a chain is included in the chain metadata
    // https://github.com/paritytech/substrate/pull/8615
    //
    // before this change, the client needed to already know the type information ahead of time
    return false
  }
  return true
}

export const filterMetadataPalletsAndItems = (
  metadata: Metadata_V14,
  palletsAndItems: Array<{
    pallet: (pallet: PalletMetadataV14) => boolean
    items: Array<(item: StorageEntryMetadataV14) => boolean>
  }>,
  keepExtraTypes?: (type: PortableTypeV14) => boolean
) => {
  // remove pallets we don't care about
  metadata.value.pallets = metadata.value.pallets.filter((pallet) =>
    // keep this pallet if it's listed in `palletsAndItems`
    palletsAndItems.some(({ pallet: palletFilter }) => palletFilter(pallet))
  )

  // remove fields we don't care about from each pallet, and extract types for each storage item we care about
  const items = palletsAndItems.flatMap(({ pallet: palletFilter, items }) => {
    const pallet = metadata.value.pallets.find(palletFilter)
    if (!pallet || !pallet.storage) {
      log.warn("Failed to find pallet", palletFilter)
      return []
    }

    // remove fields we don't care about
    pallet.events = undefined
    pallet.calls = undefined
    pallet.errors = undefined
    pallet.constants = []

    // filter and extract storage items we care about
    pallet.storage.items = pallet.storage.items.filter((item) =>
      items.some((itemFilter) => itemFilter(item))
    )

    return pallet.storage.items
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
        item?.type.__kind === "Map" && item.type.key,
        item?.type.value,
      ])
      .filter((type): type is number => typeof type === "number")
  )

  // recursively find all the types which our keepTypes depend on and add them to the keepTypes set
  addDependentTypes(metadata, keepTypes, [...keepTypes])

  // ditch the types we aren't keeping
  const isKeepType = (type: PortableTypeV14) => keepTypes.has(type.id) || keepExtraTypes?.(type)
  metadata.value.lookup.types = metadata.value.lookup.types.filter(isKeepType)
}

export const addDependentTypes = (
  metadata: Metadata_V14,
  keepTypes: Set<number>,
  types: number[]
) => {
  for (const typeIndex of types) {
    const type = metadata.value.lookup.types[typeIndex]
    if (!type) {
      log.warn(`Unable to find type with index ${typeIndex}`)
      continue
    }

    keepTypes.add(type.id)

    if (type?.type?.def?.__kind === "Array")
      addDependentTypes(metadata, keepTypes, [type.type.def.value.type])
    if (type?.type?.def?.__kind === "Compact")
      addDependentTypes(metadata, keepTypes, [type.type.def.value.type])
    if (type?.type?.def?.__kind === "Composite")
      addDependentTypes(
        metadata,
        keepTypes,
        type.type.def.value.fields.map(({ type }) => type)
      )
    if (type?.type?.def?.__kind === "Sequence")
      addDependentTypes(metadata, keepTypes, [type.type.def.value.type])
    if (type?.type?.def?.__kind === "Tuple")
      addDependentTypes(
        metadata,
        keepTypes,
        type.type.def.value.map((type) => type)
      )
    if (type?.type?.def?.__kind === "Variant")
      addDependentTypes(
        metadata,
        keepTypes,
        type.type.def.value.variants.flatMap(({ fields }) => fields.map(({ type }) => type))
      )
  }
}
