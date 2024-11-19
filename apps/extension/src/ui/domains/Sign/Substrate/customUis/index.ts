import { DecodedCallComponentDefs } from "../types"
import { CUSTOM_UI_UTILITY } from "./CustomUisUtility"

// from now on use custom UI only for batch
export const CUSTOM_UI_COMPONENTS: DecodedCallComponentDefs = [
  ...CUSTOM_UI_UTILITY, // batch
]
