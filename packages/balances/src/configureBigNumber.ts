import BigNumber from "bignumber.js"

// bignumber.js v10+ throws on invalid input by default (the STRICT option).
// Restore the v9 behaviour of returning NaN so existing callers are unaffected.
// The bignumber.js config is a shared singleton, so this applies process-wide.
// Import BigNumber from here (rather than directly from "bignumber.js") to
// guarantee this config has run before any value is constructed.
BigNumber.set({ STRICT: false })

export default BigNumber
