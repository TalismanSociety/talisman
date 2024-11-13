import { DecodedCallComponentDefs } from "../types"
// import { CUSTOM_UI_CONVICTION_VOTING } from "./CustomUisConvictionVoting"
// import { CUSTOM_UI_NOMINATION_POOLS } from "./CustomUisNominationPools"
// import { CUSTOM_UI_XCM } from "./CustomUisXcm"
// import { CUSTOM_UI_X_TOKENS } from "./CustomUisXTokens"
import { CUSTOM_UI_UTILITY } from "./CustomUisUtility"

// use custom UI only for batch
export const CUSTOM_UI_COMPONENTS: DecodedCallComponentDefs = [
  // ...CUSTOM_UI_CONVICTION_VOTING,
  // ...CUSTOM_UI_NOMINATION_POOLS,
  // ...CUSTOM_UI_X_TOKENS,
  // ...CUSTOM_UI_XCM,
  ...CUSTOM_UI_UTILITY, // batch
]
