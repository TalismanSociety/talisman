export const ERROR_CATEGORIES = [
  "user_rejected",
  "insufficient_balance",
  "insufficient_gas",
  "insufficient_fee",
  "nonce_conflict",
  "payload_expired",
  "bad_proof",
  "network_rejected",
  "dispatch_failed",
  "simulation",
  "quote_stale",
  "ledger_device_locked",
  "ledger_device_not_found",
  "ledger_wrong_app",
  "ledger",
  "wrong_password",
  "unsupported",
  "rpc",
  "timeout",
  "input_invalid",
  "storage",
  "clipboard",
  "unknown",
] as const

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number]

export const isErrorCategory = (value: unknown): value is ErrorCategory =>
  ERROR_CATEGORIES.includes(value as ErrorCategory)

const CATEGORY_KEY = Symbol.for("talisman.errorCategory")

export const attachErrorCategory = <E extends object>(error: E, category: ErrorCategory): E => {
  Object.defineProperty(error, CATEGORY_KEY, { value: category, enumerable: false })
  return error
}

export type CategoryRule =
  | { readonly match: "attached" }
  | { readonly match: "ledger" }
  | { readonly match: "swap" }
  | { readonly match: "name"; readonly names: readonly string[]; readonly category: ErrorCategory }
  | {
      readonly match: "code"
      readonly codes: readonly (number | string)[]
      readonly category: ErrorCategory
    }
  | { readonly match: "message"; readonly pattern: RegExp; readonly category: ErrorCategory }

const LEDGER_CATEGORIES: Readonly<Record<string, ErrorCategory | null>> = {
  Locked: "ledger_device_locked",
  UserRejected: "user_rejected",
  InvalidApp: "ledger_wrong_app",
  GenericAppRequired: "ledger_wrong_app",
  NotFound: "ledger_device_not_found",
  Timeout: "ledger_device_not_found",
  Network: "ledger_device_not_found",
  BrowserSecurity: "ledger_device_not_found",
  Custom: null,
}

const SWAP_CATEGORIES: Readonly<Record<string, ErrorCategory>> = {
  "insufficient-swap-balance": "insufficient_balance",
  "insufficient-fee-balance": "insufficient_gas",
  "quote-stale": "quote_stale",
  "transaction-likely-to-fail": "simulation",
  "transaction-craft-error": "simulation",
}

export const CATEGORY_RULES: readonly CategoryRule[] = [
  { match: "attached" },
  { match: "ledger" },
  { match: "swap" },
  { match: "name", names: ["InsufficientGasBalanceError"], category: "insufficient_gas" },
  {
    match: "name",
    names: ["UserRejectedRequestError", "NotAllowedError"],
    category: "user_rejected",
  },
  { match: "name", names: ["InsufficientFundsError"], category: "insufficient_gas" },
  {
    match: "name",
    names: ["NonceTooLowError", "NonceTooHighError", "NonceMaxValueError"],
    category: "nonce_conflict",
  },
  {
    match: "name",
    names: [
      "EstimateGasExecutionError",
      "CallExecutionError",
      "ContractFunctionExecutionError",
      "ContractFunctionRevertedError",
      "ExecutionRevertedError",
    ],
    category: "simulation",
  },
  {
    match: "name",
    names: [
      "HttpRequestError",
      "RpcRequestError",
      "WebSocketRequestError",
      "SocketClosedError",
      "ChainConnectionError",
      "StaleRpcError",
      "BalanceFetchNetworkError",
      "SolanaError",
    ],
    category: "rpc",
  },
  { match: "name", names: ["TimeoutError"], category: "timeout" },
  {
    match: "name",
    names: ["SecurityError", "NotSupportedError", "ConstraintError"],
    category: "unsupported",
  },
  {
    match: "name",
    names: ["DatabaseClosedError", "QuotaExceededError", "VersionError", "OpenFailedError"],
    category: "storage",
  },
  { match: "code", codes: [4001, "ACTION_REJECTED"], category: "user_rejected" },
  { match: "code", codes: [4100, 4200], category: "unsupported" },
  { match: "code", codes: [429], category: "rpc" },
  // substrate pool: already imported, priority too low
  { match: "code", codes: [1013, 1014], category: "nonce_conflict" },
  {
    match: "message",
    pattern: /^(cancell?ed|rejected)$|user (rejected|denied|cancell?ed)/i,
    category: "user_rejected",
  },
  { match: "message", pattern: /inability to pay some fees/i, category: "insufficient_fee" },
  { match: "message", pattern: /InsufficientSolForRent/i, category: "insufficient_fee" },
  { match: "message", pattern: /insufficient funds for gas/i, category: "insufficient_gas" },
  {
    match: "message",
    pattern: /insufficient ?balance|funds are unavailable/i,
    category: "insufficient_balance",
  },
  {
    match: "message",
    pattern:
      /nonce too (low|high)|already (known|imported)|replacement transaction underpriced|priority is too low|transaction is outdated/i,
    category: "nonce_conflict",
  },
  {
    match: "message",
    pattern: /ancient birth block|payload (has )?expired/i,
    category: "payload_expired",
  },
  { match: "message", pattern: /bad ?(signature|proof)/i, category: "bad_proof" },
  {
    match: "message",
    pattern: /execution reverted|gas estimation failed/i,
    category: "simulation",
  },
  { match: "message", pattern: /extrinsicfailed|dispatch error/i, category: "dispatch_failed" },
  {
    match: "message",
    pattern: /invalid transaction|^1010\b|temporarily banned/i,
    category: "network_rejected",
  },
  {
    match: "message",
    pattern: /(incorrect|invalid|wrong) password|^unauthori[sz]ed$|^failed to decrypt data$/i,
    category: "wrong_password",
  },
  { match: "message", pattern: /^timeout$|timed? ?out/i, category: "timeout" },
  {
    match: "message",
    pattern: /failed to fetch|fetch failed|networkerror|too many requests|websocket/i,
    category: "rpc",
  },
]

const MAX_CAUSE_DEPTH = 5

const layersOf = (error: unknown): unknown[] => {
  const layers: unknown[] = []
  for (let layer = error; layer != null && layers.length <= MAX_CAUSE_DEPTH; ) {
    layers.push(layer)
    layer = typeof layer === "object" ? (layer as { cause?: unknown }).cause : undefined
  }
  return layers
}

const read = (layer: unknown, key: PropertyKey): unknown =>
  typeof layer === "object" && layer !== null
    ? (layer as Record<PropertyKey, unknown>)[key]
    : undefined

/** A substrate RPC error keeps the reason in `data`: "Invalid Transaction" says little alone. */
const messageOf = (layer: unknown): string | undefined => {
  if (typeof layer === "string") return layer
  const texts = [read(layer, "message"), read(layer, "data")].filter(
    (text): text is string => typeof text === "string"
  )
  return texts.length ? texts.join(": ") : undefined
}

const categoryOfLayer = (rule: CategoryRule, layer: unknown): ErrorCategory | null => {
  switch (rule.match) {
    case "attached": {
      const attached = read(layer, CATEGORY_KEY)
      return isErrorCategory(attached) ? attached : null
    }
    case "ledger": {
      if (read(layer, "isTalismanLedgerError") !== true) return null
      const name = String(read(layer, "name"))
      return name in LEDGER_CATEGORIES ? LEDGER_CATEGORIES[name] : "ledger"
    }
    case "swap": {
      const type = read(layer, "type")
      return typeof type === "string" && Object.hasOwn(SWAP_CATEGORIES, type)
        ? SWAP_CATEGORIES[type]
        : null
    }
    case "name":
      return rule.names.includes(read(layer, "name") as string) ? rule.category : null
    case "code": {
      const codes = [read(layer, "code"), read(layer, "status")]
      return codes.some((code) => rule.codes.includes(code as number | string))
        ? rule.category
        : null
    }
    case "message": {
      const message = messageOf(layer)
      return message !== undefined && rule.pattern.test(message) ? rule.category : null
    }
  }
}

export const classifyError = (error: unknown, rules = CATEGORY_RULES): ErrorCategory => {
  const layers = layersOf(error)
  for (const rule of rules)
    for (const layer of layers) {
      const category = categoryOfLayer(rule, layer)
      if (category) return category
    }
  return "unknown"
}
