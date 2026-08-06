import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { AcalaCalls, PolkadotAssetHubCalls, PolkadotCalls } from "@polkadot-api/descriptors"
import { SUMMARY_COMPONENTS } from "@ui/domains/Sign/Substrate/summary/calls"
import { describe, expect, it } from "vitest"

/**
 * A summary component is the only thing most users read before approving a transaction, so an
 * argument it doesn't render is an argument the signer never sees. This declares, for every
 * registered call, which arguments the summary shows and which it deliberately leaves out.
 *
 * `ignored` must list every argument not in `displayed`, so a runtime upgrade that adds an
 * argument breaks the typecheck until someone decides whether it belongs on the sign screen.
 */
const coverage =
  <TArgs>() =>
  <const TDisplayed extends readonly (keyof TArgs)[]>(
    displayed: TDisplayed,
    ignored: Record<Exclude<keyof TArgs, TDisplayed[number]>, string>
  ) => ({ displayed: displayed as readonly (string | number | symbol)[], ignored })

const WEIGHT_LIMIT_REASON =
  "caps destination execution weight; it moves no funds, but too low a limit can strand the transfer on the destination chain. It stays in the raw call view because a raw weight is neither interpretable by the signer nor checkable by us: proving one sufficient needs the destination runtime's own weight for the message, which the source chain cannot answer."

const SUMMARY_ARGS_COVERAGE = {
  "ConvictionVoting.vote": coverage<PolkadotCalls["ConvictionVoting"]["vote"]>()(
    ["poll_index", "vote"],
    {}
  ),
  "ConvictionVoting.unlock": coverage<PolkadotCalls["ConvictionVoting"]["unlock"]>()(["class"], {
    target: "the account whose expired lock is released; the funds stay with that account",
  }),
  "ConvictionVoting.delegate": coverage<PolkadotCalls["ConvictionVoting"]["delegate"]>()(
    ["class", "to", "conviction", "balance"],
    {}
  ),
  "ConvictionVoting.undelegate": coverage<PolkadotCalls["ConvictionVoting"]["undelegate"]>()(
    ["class"],
    {}
  ),

  "NominationPools.join": coverage<PolkadotCalls["NominationPools"]["join"]>()(
    ["amount", "pool_id"],
    {}
  ),
  "NominationPools.set_claim_permission": coverage<
    PolkadotCalls["NominationPools"]["set_claim_permission"]
  >()(["permission"], {}),
  "NominationPools.withdraw_unbonded": coverage<
    PolkadotCalls["NominationPools"]["withdraw_unbonded"]
  >()([], {
    member_account: "the pool member being withdrawn for; the funds go to that member",
    num_slashing_spans: "chain bookkeeping, carries no value",
  }),
  "NominationPools.bond_extra": coverage<PolkadotCalls["NominationPools"]["bond_extra"]>()(
    ["extra"],
    {}
  ),
  "NominationPools.claim_payout": coverage<PolkadotCalls["NominationPools"]["claim_payout"]>()(
    [],
    {}
  ),

  "Balances.transfer_keep_alive": coverage<PolkadotCalls["Balances"]["transfer_keep_alive"]>()(
    ["dest", "value"],
    {}
  ),
  "Balances.transfer_allow_death": coverage<PolkadotCalls["Balances"]["transfer_allow_death"]>()(
    ["dest", "value"],
    {}
  ),
  "Balances.transfer_all": coverage<PolkadotCalls["Balances"]["transfer_all"]>()(
    ["dest", "keep_alive"],
    {}
  ),

  "XcmPallet.reserve_transfer_assets": coverage<
    PolkadotCalls["XcmPallet"]["reserve_transfer_assets"]
  >()(["dest", "beneficiary", "assets"], {
    fee_asset_item: "selects which of `assets` pays for execution, it moves no extra funds",
  }),
  "XcmPallet.limited_reserve_transfer_assets": coverage<
    PolkadotCalls["XcmPallet"]["limited_reserve_transfer_assets"]
  >()(["dest", "beneficiary", "assets"], {
    fee_asset_item: "selects which of `assets` pays for execution, it moves no extra funds",
    weight_limit: WEIGHT_LIMIT_REASON,
  }),
  "XcmPallet.limited_teleport_assets": coverage<
    PolkadotCalls["XcmPallet"]["limited_teleport_assets"]
  >()(["dest", "beneficiary", "assets"], {
    fee_asset_item: "selects which of `assets` pays for execution, it moves no extra funds",
    weight_limit: WEIGHT_LIMIT_REASON,
  }),
  "PolkadotXcm.reserve_transfer_assets": coverage<
    PolkadotAssetHubCalls["PolkadotXcm"]["reserve_transfer_assets"]
  >()(["dest", "beneficiary", "assets"], {
    fee_asset_item: "selects which of `assets` pays for execution, it moves no extra funds",
  }),
  "PolkadotXcm.limited_reserve_transfer_assets": coverage<
    PolkadotAssetHubCalls["PolkadotXcm"]["limited_reserve_transfer_assets"]
  >()(["dest", "beneficiary", "assets"], {
    fee_asset_item: "selects which of `assets` pays for execution, it moves no extra funds",
    weight_limit: WEIGHT_LIMIT_REASON,
  }),
  "PolkadotXcm.limited_teleport_assets": coverage<
    PolkadotAssetHubCalls["PolkadotXcm"]["limited_teleport_assets"]
  >()(["dest", "beneficiary", "assets"], {
    fee_asset_item: "selects which of `assets` pays for execution, it moves no extra funds",
    weight_limit: WEIGHT_LIMIT_REASON,
  }),

  "XTokens.transfer": coverage<AcalaCalls["XTokens"]["transfer"]>()(
    ["currency_id", "amount", "dest"],
    { dest_weight_limit: WEIGHT_LIMIT_REASON }
  ),
  "XTokens.transfer_with_fee": coverage<AcalaCalls["XTokens"]["transfer_with_fee"]>()(
    ["currency_id", "amount", "fee", "dest"],
    { dest_weight_limit: WEIGHT_LIMIT_REASON }
  ),

  "Assets.transfer": coverage<PolkadotAssetHubCalls["Assets"]["transfer"]>()(
    ["id", "target", "amount"],
    {}
  ),
  "Assets.transfer_keep_alive": coverage<PolkadotAssetHubCalls["Assets"]["transfer_keep_alive"]>()(
    ["id", "target", "amount"],
    {}
  ),
  "ForeignAssets.transfer": coverage<PolkadotAssetHubCalls["ForeignAssets"]["transfer"]>()(
    ["id", "target", "amount"],
    {}
  ),
  "ForeignAssets.transfer_keep_alive": coverage<
    PolkadotAssetHubCalls["ForeignAssets"]["transfer_keep_alive"]
  >()(["id", "target", "amount"], {}),

  "AssetConversion.swap_exact_tokens_for_tokens": coverage<
    PolkadotAssetHubCalls["AssetConversion"]["swap_exact_tokens_for_tokens"]
  >()(["path", "amount_in", "amount_out_min", "send_to"], {
    keep_alive: "only decides whether the swap may reap the signer account",
  }),

  "System.remark": coverage<PolkadotCalls["System"]["remark"]>()(["remark"], {}),
  "System.remark_with_event": coverage<PolkadotCalls["System"]["remark_with_event"]>()(
    ["remark"],
    {}
  ),
} as const

const SOURCE_FILES: Record<string, string> = {
  AssetConversion: "SummaryAssetConversion.tsx",
  Assets: "SummaryAssets.tsx",
  Balances: "SummaryBalances.tsx",
  ConvictionVoting: "SummaryConvictionVoting.tsx",
  ForeignAssets: "SummaryForeignAssets.tsx",
  NominationPools: "SummaryNominationPools.tsx",
  PolkadotXcm: "SummaryXcm.tsx",
  System: "SummarySystem.tsx",
  XcmPallet: "SummaryXcm.tsx",
  XTokens: "SummaryXTokens.tsx",
}

const CALLS_DIR = resolve(process.cwd(), "src/ui/domains/Sign/Substrate/summary/calls")

const readSource = (pallet: string) =>
  readFileSync(resolve(CALLS_DIR, SOURCE_FILES[pallet]), "utf8")

const registeredCalls = SUMMARY_COMPONENTS.map(([pallet, method]) => `${pallet}.${method}`)

describe("summary call args coverage", () => {
  it("declares coverage for every registered summary component", () => {
    expect(registeredCalls.toSorted()).toStrictEqual(Object.keys(SUMMARY_ARGS_COVERAGE).toSorted())
  })

  it.each(Object.entries(SUMMARY_ARGS_COVERAGE))("%s renders the args it claims to", (call, {
    displayed,
  }) => {
    const source = readSource(call.split(".")[0] as string)

    for (const arg of displayed) expect(source).toContain(`args.${String(arg)}`)
  })

  it.each(Object.entries(SUMMARY_ARGS_COVERAGE))("%s explains every arg it leaves out", (_call, {
    ignored,
  }) => {
    for (const reason of Object.values(ignored)) expect(String(reason).length).toBeGreaterThan(0)
  })
})
