const EXIT_PARAMS = {
  components: [
    { name: "ss58", type: "bytes32" },
    { name: "evmFallback", type: "address" },
    { name: "wantLiquid", type: "bool" },
    { name: "minTaoOut", type: "uint256" },
  ],
  name: "exit",
  type: "tuple",
} as const

export const abiForevermoneySpokeGateway = [
  {
    inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, EXIT_PARAMS],
    name: "quoteBridgeToFinney",
    outputs: [{ name: "fee", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, EXIT_PARAMS],
    name: "bridgeToFinney",
    outputs: [{ name: "messageId", type: "bytes32" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "ss58", type: "bytes32" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "messageId", type: "bytes32" },
    ],
    name: "BridgedToFinney",
    type: "event",
  },
] as const

export const abiForevermoneyAlphaGateway = [
  {
    inputs: [
      { name: "destSelector", type: "uint64" },
      { name: "token", type: "address" },
      { name: "recipient", type: "address" },
      { name: "mintedAmount", type: "uint256" },
    ],
    name: "quoteBridgeOut",
    outputs: [{ name: "fee", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "destSelector", type: "uint64" },
      { name: "token", type: "address" },
      { name: "recipient", type: "address" },
      { name: "taoAmount", type: "uint256" },
      { name: "stakedAlphaRao", type: "uint256" },
      { name: "minTokenOut", type: "uint256" },
    ],
    name: "bridgeOut",
    outputs: [{ name: "messageId", type: "bytes32" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "destSelector", type: "uint64" }],
    name: "allowedLane",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, name: "destChainSelector", type: "uint64" },
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "minted", type: "uint256" },
      { indexed: false, name: "messageId", type: "bytes32" },
    ],
    name: "BridgedOut",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "native", type: "uint256" },
      { indexed: false, name: "wsn", type: "uint256" },
    ],
    name: "Claimable",
    type: "event",
  },
] as const

export const abiForevermoneyAlphaVault = [
  {
    inputs: [],
    name: "isPaused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "migrationTarget",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

export const abiCcipTokenPool = [
  {
    inputs: [{ name: "remoteChainSelector", type: "uint64" }],
    name: "getCurrentOutboundRateLimiterState",
    outputs: [
      {
        components: [
          { name: "tokens", type: "uint128" },
          { name: "lastUpdated", type: "uint32" },
          { name: "isEnabled", type: "bool" },
          { name: "capacity", type: "uint128" },
          { name: "rate", type: "uint128" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const

export const abiCcipOffRamp = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "sourceChainSelector", type: "uint64" },
      { indexed: true, name: "sequenceNumber", type: "uint64" },
      { indexed: true, name: "messageId", type: "bytes32" },
      { indexed: false, name: "messageHash", type: "bytes32" },
      { indexed: false, name: "state", type: "uint8" },
      { indexed: false, name: "returnData", type: "bytes" },
      { indexed: false, name: "gasUsed", type: "uint256" },
    ],
    name: "ExecutionStateChanged",
    type: "event",
  },
] as const

export const CCIP_EXECUTION_STATE_SUCCESS = 2
export const CCIP_EXECUTION_STATE_FAILURE = 3
