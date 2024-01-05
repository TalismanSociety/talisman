import * as $ from "@talismn/subshape-fork"

// Type 79 - xcm::v3::junction::NetworkId
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

// Type 78 - Option
// Param T : 79
type Option78 = XcmV3NetworkId | undefined
const $option78: $.Shape<Option78> = $.option($xcmV3NetworkId)

// Type 80 - xcm::v3::junction::BodyId
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

// Type 81 - xcm::v3::junction::BodyPart
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

// Type 76 - xcm::v3::junction::Junction
export type XcmV3Junction =
  | { type: "Parachain"; value: number }
  | { type: "AccountId32"; network: Option78; id: Uint8Array }
  | { type: "AccountIndex64"; network: Option78; index: bigint }
  | { type: "AccountKey20"; network: Option78; key: Uint8Array }
  | { type: "PalletInstance"; value: number }
  | { type: "GeneralIndex"; value: bigint }
  | { type: "GeneralKey"; length: number; data: Uint8Array }
  | { type: "OnlyChild" }
  | { type: "Plurality"; id: XcmV3BodyId; part: XcmV3BodyPart }
  | { type: "GlobalConsensus"; value: XcmV3NetworkId }

export const $xcmV3Junction: $.Shape<XcmV3Junction> = $.taggedUnion("type", {
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
      $.deferred(() => $option78)
    ),
    $.field("index", $.compact($.u64))
  ),
  3: $.variant(
    "AccountKey20",
    $.field(
      "network",
      $.deferred(() => $option78)
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
