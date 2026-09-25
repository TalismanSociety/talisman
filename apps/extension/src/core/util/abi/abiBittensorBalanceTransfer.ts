// only the payable `transfer` has a signing summary, so the other precompile methods
// (transferKeepAlive, transferAll) stay undecoded and keep the unknown-call warning
export const abiBittensorBalanceTransfer = [
  {
    inputs: [{ internalType: "bytes32", name: "data", type: "bytes32" }],
    name: "transfer",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const
