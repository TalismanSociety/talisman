export const abiMoonConvictionVoting = [
  {
    inputs: [
      { internalType: "uint16", name: "trackId", type: "uint16" },
      { internalType: "address", name: "representative", type: "address" },
      { internalType: "enum ConvictionVoting.Conviction", name: "conviction", type: "uint8" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "delegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "target", type: "address" },
      { internalType: "uint16", name: "trackId", type: "uint16" },
      { internalType: "uint32", name: "pollIndex", type: "uint32" },
    ],
    name: "removeOtherVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint32", name: "pollIndex", type: "uint32" }],
    name: "removeVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint16", name: "trackId", type: "uint16" }],
    name: "undelegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint16", name: "trackId", type: "uint16" },
      { internalType: "address", name: "target", type: "address" },
    ],
    name: "unlock",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint32", name: "pollIndex", type: "uint32" },
      { internalType: "uint256", name: "voteAmount", type: "uint256" },
      { internalType: "enum ConvictionVoting.Conviction", name: "conviction", type: "uint8" },
    ],
    name: "voteNo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint32", name: "pollIndex", type: "uint32" },
      { internalType: "uint256", name: "voteAmount", type: "uint256" },
      { internalType: "enum ConvictionVoting.Conviction", name: "conviction", type: "uint8" },
    ],
    name: "voteYes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const
