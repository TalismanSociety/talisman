import { DecodedCallSummaryComponentDefs } from "../../types"
import { SUMMARY_COMPONENTS_ASSET_CONVERSION } from "./SummaryAssetConversion"
import { SUMMARY_COMPONENTS_ASSETS } from "./SummaryAssets"
import { SUMMARY_COMPONENTS_BALANCES } from "./SummaryBalances"
import { SUMMARY_COMPONENTS_CONVICTION_VOTING } from "./SummaryConvictionVoting"
import { SUMMARY_COMPONENTS_FOREIGN_ASSETS } from "./SummaryForeignAssets"
import { SUMMARY_COMPONENTS_NOMINATION_POOLS } from "./SummaryNominationPools"
import { SUMMARY_COMPONENTS_SYSTEM } from "./SummarySystem"
import { SUMMARY_COMPONENTS_XCM } from "./SummaryXcm"
import { SUMMARY_COMPONENTS_X_TOKENS } from "./SummaryXTokens"

export const SUMMARY_COMPONENTS: DecodedCallSummaryComponentDefs = [
  ...SUMMARY_COMPONENTS_CONVICTION_VOTING,
  ...SUMMARY_COMPONENTS_NOMINATION_POOLS,
  ...SUMMARY_COMPONENTS_BALANCES,
  ...SUMMARY_COMPONENTS_XCM,
  ...SUMMARY_COMPONENTS_X_TOKENS,
  ...SUMMARY_COMPONENTS_ASSETS,
  ...SUMMARY_COMPONENTS_FOREIGN_ASSETS,
  ...SUMMARY_COMPONENTS_ASSET_CONVERSION,
  ...SUMMARY_COMPONENTS_SYSTEM,
]
