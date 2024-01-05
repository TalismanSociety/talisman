import * as $ from "@talismn/subshape-fork"

// Type 379 - bounded_collections::weak_bounded_vec::WeakBoundedVec
// Param T : 2
type BoundedCollectionsWeakBoundedVecWeakBoundedVec379 = Uint8Array
const $boundedCollectionsWeakBoundedVecWeakBoundedVec379: $.Shape<BoundedCollectionsWeakBoundedVecWeakBoundedVec379> =
  $.uint8Array

// Type 378 - xcm::v2::NetworkId
type XcmV2NetworkId =
  | { type: "Any" }
  | { type: "Named"; value: BoundedCollectionsWeakBoundedVecWeakBoundedVec379 }
  | { type: "Polkadot" }
  | { type: "Kusama" }
const $xcmV2NetworkId: $.Shape<XcmV2NetworkId> = $.taggedUnion("type", {
  0: $.variant("Any"),
  1: $.variant("Named", $.field("value", $.uint8Array)),
  2: $.variant("Polkadot"),
  3: $.variant("Kusama"),
})

// Type 380 - xcm::v2::BodyId
type XcmV2BodyId =
  | { type: "Unit" }
  | { type: "Named"; value: BoundedCollectionsWeakBoundedVecWeakBoundedVec379 }
  | { type: "Index"; value: number }
  | { type: "Executive" }
  | { type: "Technical" }
  | { type: "Legislative" }
  | { type: "Judicial" }
  | { type: "Defense" }
  | { type: "Administration" }
  | { type: "Treasury" }
const $xcmV2BodyId: $.Shape<XcmV2BodyId> = $.taggedUnion("type", {
  0: $.variant("Unit"),
  1: $.variant("Named", $.field("value", $boundedCollectionsWeakBoundedVecWeakBoundedVec379)),
  2: $.variant("Index", $.field("value", $.compact($.u32))),
  3: $.variant("Executive"),
  4: $.variant("Technical"),
  5: $.variant("Legislative"),
  6: $.variant("Judicial"),
  7: $.variant("Defense"),
  8: $.variant("Administration"),
  9: $.variant("Treasury"),
})

// Type 381 - xcm::v2::BodyPart
type XcmV2BodyPart =
  | { type: "Voice" }
  | { type: "Members"; count: number }
  | { type: "Fraction"; nom: number; denom: number }
  | { type: "AtLeastProportion"; nom: number; denom: number }
  | { type: "MoreThanProportion"; nom: number; denom: number }
const $xcmV2BodyPart: $.Shape<XcmV2BodyPart> = $.taggedUnion("type", {
  0: $.variant("Voice"),
  1: $.variant("Members", $.field("count", $.compact($.u32))),
  2: $.variant("Fraction", $.field("nom", $.compact($.u32)), $.field("denom", $.compact($.u32))),
  3: $.variant(
    "AtLeastProportion",
    $.field("nom", $.compact($.u32)),
    $.field("denom", $.compact($.u32))
  ),
  4: $.variant(
    "MoreThanProportion",
    $.field("nom", $.compact($.u32)),
    $.field("denom", $.compact($.u32))
  ),
})

// Type 377 - xcm::v2::junction::Junction
type XcmV2Junction =
  | { type: "Parachain"; value: number }
  | { type: "AccountId32"; network: XcmV2NetworkId; id: Uint8Array }
  | { type: "AccountIndex64"; network: XcmV2NetworkId; index: bigint }
  | { type: "AccountKey20"; network: XcmV2NetworkId; key: Uint8Array }
  | { type: "PalletInstance"; value: number }
  | { type: "GeneralIndex"; value: bigint }
  | {
      type: "GeneralKey"
      value: BoundedCollectionsWeakBoundedVecWeakBoundedVec379
    }
  | { type: "OnlyChild" }
  | { type: "Plurality"; id: XcmV2BodyId; part: XcmV2BodyPart }
const $xcmV2Junction: $.Shape<XcmV2Junction> = $.taggedUnion("type", {
  0: $.variant("Parachain", $.field("value", $.compact($.u32))),
  1: $.variant(
    "AccountId32",
    $.field("network", $xcmV2NetworkId),
    $.field("id", $.sizedUint8Array(32))
  ),
  2: $.variant(
    "AccountIndex64",
    $.field(
      "network",
      $.deferred(() => $xcmV2NetworkId)
    ),
    $.field("index", $.compact($.u64))
  ),
  3: $.variant(
    "AccountKey20",
    $.field(
      "network",
      $.deferred(() => $xcmV2NetworkId)
    ),
    $.field("key", $.sizedUint8Array(20))
  ),
  4: $.variant("PalletInstance", $.field("value", $.u8)),
  5: $.variant("GeneralIndex", $.field("value", $.compact($.u128))),
  6: $.variant("GeneralKey", $.field("value", $boundedCollectionsWeakBoundedVecWeakBoundedVec379)),
  7: $.variant("OnlyChild"),
  8: $.variant("Plurality", $.field("id", $xcmV2BodyId), $.field("part", $xcmV2BodyPart)),
})

// Type 376 - xcm::v2::multilocation::Junctions
type XcmV2Junctions =
  | { type: "Here" }
  | { type: "X1"; value: XcmV2Junction }
  | { type: "X2"; value: [XcmV2Junction, XcmV2Junction] }
  | { type: "X3"; value: [XcmV2Junction, XcmV2Junction, XcmV2Junction] }
  | {
      type: "X4"
      value: [XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction]
    }
  | {
      type: "X5"
      value: [XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction, XcmV2Junction]
    }
  | {
      type: "X6"
      value: [
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction
      ]
    }
  | {
      type: "X7"
      value: [
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction
      ]
    }
  | {
      type: "X8"
      value: [
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction,
        XcmV2Junction
      ]
    }
const $xcmV2Junctions: $.Shape<XcmV2Junctions> = $.taggedUnion("type", {
  0: $.variant("Here"),
  1: $.variant("X1", $.field("value", $xcmV2Junction)),
  2: $.variant(
    "X2",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction)
      )
    )
  ),
  3: $.variant(
    "X3",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction)
      )
    )
  ),
  4: $.variant(
    "X4",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction)
      )
    )
  ),
  5: $.variant(
    "X5",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction)
      )
    )
  ),
  6: $.variant(
    "X6",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction)
      )
    )
  ),
  7: $.variant(
    "X7",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction)
      )
    )
  ),
  8: $.variant(
    "X8",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction),
        $.deferred(() => $xcmV2Junction)
      )
    )
  ),
})

// Type 375 - xcm::v2::multilocation::MultiLocation
type XcmV2MultiLocation = { parents: number; interior: XcmV2Junctions }
const $xcmV2MultiLocation: $.Shape<XcmV2MultiLocation> = $.object(
  $.field("parents", $.u8),
  $.field("interior", $xcmV2Junctions)
)

// Type 389 - xcm::v2::multiasset::AssetId
type XcmV2AssetId =
  | { type: "Concrete"; value: XcmV2MultiLocation }
  | { type: "Abstract"; value: Uint8Array }
const $xcmV2AssetId: $.Shape<XcmV2AssetId> = $.taggedUnion("type", {
  0: $.variant("Concrete", $.field("value", $xcmV2MultiLocation)),
  1: $.variant("Abstract", $.field("value", $.uint8Array)),
})

// Type 391 - xcm::v2::multiasset::AssetInstance
type XcmV2AssetInstance =
  | { type: "Undefined" }
  | { type: "Index"; value: bigint }
  | { type: "Array4"; value: Uint8Array }
  | { type: "Array8"; value: Uint8Array }
  | { type: "Array16"; value: Uint8Array }
  | { type: "Array32"; value: Uint8Array }
  | { type: "Blob"; value: Uint8Array }
const $xcmV2AssetInstance: $.Shape<XcmV2AssetInstance> = $.taggedUnion("type", {
  0: $.variant("Undefined"),
  1: $.variant("Index", $.field("value", $.compact($.u128))),
  2: $.variant("Array4", $.field("value", $.sizedUint8Array(4))),
  3: $.variant("Array8", $.field("value", $.sizedUint8Array(8))),
  4: $.variant("Array16", $.field("value", $.sizedUint8Array(16))),
  5: $.variant("Array32", $.field("value", $.sizedUint8Array(32))),
  6: $.variant("Blob", $.field("value", $.uint8Array)),
})

// Type 390 - xcm::v2::multiasset::Fungibility
type XcmV2Fungibility =
  | { type: "Fungible"; value: bigint }
  | { type: "NonFungible"; value: XcmV2AssetInstance }
const $xcmV2Fungibility: $.Shape<XcmV2Fungibility> = $.taggedUnion("type", {
  0: $.variant("Fungible", $.field("value", $.compact($.u128))),
  1: $.variant("NonFungible", $.field("value", $xcmV2AssetInstance)),
})

// Type 388 - xcm::v2::multiasset::MultiAsset
type XcmV2MultiAsset = { id: XcmV2AssetId; fun: XcmV2Fungibility }
const $xcmV2MultiAsset: $.Shape<XcmV2MultiAsset> = $.object(
  $.field("id", $xcmV2AssetId),
  $.field("fun", $xcmV2Fungibility)
)

// Type 386 - xcm::v2::multiasset::MultiAssets
type XcmV2MultiAssets = Array<XcmV2MultiAsset>
const $xcmV2MultiAssets: $.Shape<XcmV2MultiAssets> = $.array($xcmV2MultiAsset)

// Type 168 - xcm::v3::junction::NetworkId
type XcmV3NetworkId =
  | { type: "ByGenesis"; value: Uint8Array }
  | { type: "ByFork"; blockNumber: bigint; blockHash: Uint8Array }
  | { type: "Polkadot" }
  | { type: "Kusama" }
  | { type: "Westend" }
  | { type: "Rococo" }
  | { type: "Wococo" }
  | { type: "Ethereum"; chainId: bigint }
  | { type: "BitcoinCore" }
  | { type: "BitcoinCash" }
const $xcmV3NetworkId: $.Shape<XcmV3NetworkId> = $.taggedUnion("type", {
  0: $.variant("ByGenesis", $.field("value", $.sizedUint8Array(32))),
  1: $.variant(
    "ByFork",
    $.field("blockNumber", $.u64),
    $.field("blockHash", $.sizedUint8Array(32))
  ),
  2: $.variant("Polkadot"),
  3: $.variant("Kusama"),
  4: $.variant("Westend"),
  5: $.variant("Rococo"),
  6: $.variant("Wococo"),
  7: $.variant("Ethereum", $.field("chainId", $.compact($.u64))),
  8: $.variant("BitcoinCore"),
  9: $.variant("BitcoinCash"),
})

// Type 167 - Option
// Param T : 168
type Option167 = XcmV3NetworkId | undefined
const $option167: $.Shape<Option167> = $.option($xcmV3NetworkId)

// Type 169 - xcm::v3::junction::BodyId
type XcmV3BodyId =
  | { type: "Unit" }
  | { type: "Moniker"; value: Uint8Array }
  | { type: "Index"; value: number }
  | { type: "Executive" }
  | { type: "Technical" }
  | { type: "Legislative" }
  | { type: "Judicial" }
  | { type: "Defense" }
  | { type: "Administration" }
  | { type: "Treasury" }
const $xcmV3BodyId: $.Shape<XcmV3BodyId> = $.taggedUnion("type", {
  0: $.variant("Unit"),
  1: $.variant("Moniker", $.field("value", $.sizedUint8Array(4))),
  2: $.variant("Index", $.field("value", $.compact($.u32))),
  3: $.variant("Executive"),
  4: $.variant("Technical"),
  5: $.variant("Legislative"),
  6: $.variant("Judicial"),
  7: $.variant("Defense"),
  8: $.variant("Administration"),
  9: $.variant("Treasury"),
})

// Type 170 - xcm::v3::junction::BodyPart
type XcmV3BodyPart =
  | { type: "Voice" }
  | { type: "Members"; count: number }
  | { type: "Fraction"; nom: number; denom: number }
  | { type: "AtLeastProportion"; nom: number; denom: number }
  | { type: "MoreThanProportion"; nom: number; denom: number }
const $xcmV3BodyPart: $.Shape<XcmV3BodyPart> = $.taggedUnion("type", {
  0: $.variant("Voice"),
  1: $.variant("Members", $.field("count", $.compact($.u32))),
  2: $.variant("Fraction", $.field("nom", $.compact($.u32)), $.field("denom", $.compact($.u32))),
  3: $.variant(
    "AtLeastProportion",
    $.field("nom", $.compact($.u32)),
    $.field("denom", $.compact($.u32))
  ),
  4: $.variant(
    "MoreThanProportion",
    $.field("nom", $.compact($.u32)),
    $.field("denom", $.compact($.u32))
  ),
})

// Type 166 - xcm::v3::junction::Junction
type XcmV3Junction =
  | { type: "Parachain"; value: number }
  | { type: "AccountId32"; network: Option167; id: Uint8Array }
  | { type: "AccountIndex64"; network: Option167; index: bigint }
  | { type: "AccountKey20"; network: Option167; key: Uint8Array }
  | { type: "PalletInstance"; value: number }
  | { type: "GeneralIndex"; value: bigint }
  | { type: "GeneralKey"; length: number; data: Uint8Array }
  | { type: "OnlyChild" }
  | { type: "Plurality"; id: XcmV3BodyId; part: XcmV3BodyPart }
  | { type: "GlobalConsensus"; value: XcmV3NetworkId }
const $xcmV3Junction: $.Shape<XcmV3Junction> = $.taggedUnion("type", {
  0: $.variant("Parachain", $.field("value", $.compact($.u32))),
  1: $.variant(
    "AccountId32",
    $.field("network", $.option($xcmV3NetworkId)),
    $.field("id", $.sizedUint8Array(32))
  ),
  2: $.variant(
    "AccountIndex64",
    $.field(
      "network",
      $.deferred(() => $option167)
    ),
    $.field("index", $.compact($.u64))
  ),
  3: $.variant(
    "AccountKey20",
    $.field(
      "network",
      $.deferred(() => $option167)
    ),
    $.field("key", $.sizedUint8Array(20))
  ),
  4: $.variant("PalletInstance", $.field("value", $.u8)),
  5: $.variant("GeneralIndex", $.field("value", $.compact($.u128))),
  6: $.variant("GeneralKey", $.field("length", $.u8), $.field("data", $.sizedUint8Array(32))),
  7: $.variant("OnlyChild"),
  8: $.variant("Plurality", $.field("id", $xcmV3BodyId), $.field("part", $xcmV3BodyPart)),
  9: $.variant(
    "GlobalConsensus",
    $.field(
      "value",
      $.deferred(() => $xcmV3NetworkId)
    )
  ),
})

// Type 165 - xcm::v3::junctions::Junctions
type XcmV3Junctions =
  | { type: "Here" }
  | { type: "X1"; value: XcmV3Junction }
  | { type: "X2"; value: [XcmV3Junction, XcmV3Junction] }
  | { type: "X3"; value: [XcmV3Junction, XcmV3Junction, XcmV3Junction] }
  | {
      type: "X4"
      value: [XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction]
    }
  | {
      type: "X5"
      value: [XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction, XcmV3Junction]
    }
  | {
      type: "X6"
      value: [
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction
      ]
    }
  | {
      type: "X7"
      value: [
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction
      ]
    }
  | {
      type: "X8"
      value: [
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction,
        XcmV3Junction
      ]
    }
const $xcmV3Junctions: $.Shape<XcmV3Junctions> = $.taggedUnion("type", {
  0: $.variant("Here"),
  1: $.variant("X1", $.field("value", $xcmV3Junction)),
  2: $.variant(
    "X2",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction)
      )
    )
  ),
  3: $.variant(
    "X3",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction)
      )
    )
  ),
  4: $.variant(
    "X4",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction)
      )
    )
  ),
  5: $.variant(
    "X5",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction)
      )
    )
  ),
  6: $.variant(
    "X6",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction)
      )
    )
  ),
  7: $.variant(
    "X7",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction)
      )
    )
  ),
  8: $.variant(
    "X8",
    $.field(
      "value",
      $.tuple(
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction),
        $.deferred(() => $xcmV3Junction)
      )
    )
  ),
})

// Type 164 - xcm::v3::multilocation::MultiLocation
type XcmV3MultiLocation = { parents: number; interior: XcmV3Junctions }
const $xcmV3MultiLocation: $.Shape<XcmV3MultiLocation> = $.object(
  $.field("parents", $.u8),
  $.field("interior", $xcmV3Junctions)
)

// Type 408 - xcm::v3::multiasset::AssetId
type XcmV3AssetId =
  | { type: "Concrete"; value: XcmV3MultiLocation }
  | { type: "Abstract"; value: Uint8Array }
const $xcmV3AssetId: $.Shape<XcmV3AssetId> = $.taggedUnion("type", {
  0: $.variant("Concrete", $.field("value", $xcmV3MultiLocation)),
  1: $.variant("Abstract", $.field("value", $.sizedUint8Array(32))),
})

// Type 410 - xcm::v3::multiasset::AssetInstance
type XcmV3AssetInstance =
  | { type: "Undefined" }
  | { type: "Index"; value: bigint }
  | { type: "Array4"; value: Uint8Array }
  | { type: "Array8"; value: Uint8Array }
  | { type: "Array16"; value: Uint8Array }
  | { type: "Array32"; value: Uint8Array }
const $xcmV3AssetInstance: $.Shape<XcmV3AssetInstance> = $.taggedUnion("type", {
  0: $.variant("Undefined"),
  1: $.variant("Index", $.field("value", $.compact($.u128))),
  2: $.variant("Array4", $.field("value", $.sizedUint8Array(4))),
  3: $.variant("Array8", $.field("value", $.sizedUint8Array(8))),
  4: $.variant("Array16", $.field("value", $.sizedUint8Array(16))),
  5: $.variant("Array32", $.field("value", $.sizedUint8Array(32))),
})

// Type 409 - xcm::v3::multiasset::Fungibility
type XcmV3Fungibility =
  | { type: "Fungible"; value: bigint }
  | { type: "NonFungible"; value: XcmV3AssetInstance }
const $xcmV3Fungibility: $.Shape<XcmV3Fungibility> = $.taggedUnion("type", {
  0: $.variant("Fungible", $.field("value", $.compact($.u128))),
  1: $.variant("NonFungible", $.field("value", $xcmV3AssetInstance)),
})

// Type 407 - xcm::v3::multiasset::MultiAsset
type XcmV3MultiAsset = { id: XcmV3AssetId; fun: XcmV3Fungibility }
const $xcmV3MultiAsset: $.Shape<XcmV3MultiAsset> = $.object(
  $.field("id", $xcmV3AssetId),
  $.field("fun", $xcmV3Fungibility)
)

// Type 405 - xcm::v3::multiasset::MultiAssets
type XcmV3MultiAssets = Array<XcmV3MultiAsset>
const $xcmV3MultiAssets: $.Shape<XcmV3MultiAssets> = $.array($xcmV3MultiAsset)

// Type 427 - xcm::VersionedMultiAssets
export type VersionedMultiAssets =
  | { type: "V2"; value: XcmV2MultiAssets }
  | { type: "V3"; value: XcmV3MultiAssets }

export const $versionedMultiAssets: $.Shape<VersionedMultiAssets> = $.taggedUnion("type", {
  1: $.variant("V2", $.field("value", $xcmV2MultiAssets)),
  3: $.variant("V3", $.field("value", $xcmV3MultiAssets)),
})
