export const abiErc721 = [
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function tokenURI(uint256 tokenId) view returns (string)",

  "function supportsInterface(bytes4 interfaceId) external view returns (bool)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes data) external payable",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external payable",
  "function transferFrom(address from, address to, uint256 tokenId) external payable",
  "function approve(address operator, uint256 tokenId) external payable",
  "function setApprovalForAll(address operator, bool approved) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",

  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
] as const
