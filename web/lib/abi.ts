export const provenantAbi = [
  {
    type: "function",
    name: "registerDataset",
    stateMutability: "payable",
    inputs: [
      { name: "root", type: "bytes32" },
      { name: "manifestHash", type: "bytes32" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "fingerprint", type: "bytes32" },
      { name: "royalty", type: "uint256" },
      { name: "proof", type: "bytes32[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "dataset",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "root", type: "bytes32" },
      { name: "manifestHash", type: "bytes32" },
      { name: "lab", type: "address" },
      { name: "deposit", type: "uint256" },
      { name: "claimed", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "nextId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "DatasetRegistered",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "lab", type: "address", indexed: true },
      { name: "root", type: "bytes32", indexed: false },
      { name: "manifestHash", type: "bytes32", indexed: false },
      { name: "deposit", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RoyaltyPaid",
    inputs: [
      { name: "datasetId", type: "uint256", indexed: true },
      { name: "fingerprint", type: "bytes32", indexed: true },
      { name: "author", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
