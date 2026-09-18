const messages = new Set([
  "pub(authorize.tab)",
  "pub(bytes.sign)",
  "pub(extrinsic.sign)",
  "pub(vrf.sign)",
  "pub(accounts.list)",
  "pub(accounts.subscribe)",
  "pub(solana.provider.connect)",
  "pub(solana.provider.signIn)",
  "pub(solana.provider.signMessage)",
  "pub(solana.provider.signTransaction)",
])

const ethereumMethods = new Set([
  "eth_requestAccounts",
  "wallet_requestPermissions",
  "personal_sign",
  "eth_signTypedData",
  "eth_signTypedData_v1",
  "eth_signTypedData_v3",
  "eth_signTypedData_v4",
  "eth_sendTransaction",
])

export async function shouldScanSite(
  type: string,
  request: unknown,
  isConnected: () => Promise<boolean>
): Promise<boolean> {
  if (messages.has(type)) return true
  if (type !== "pub(eth.request)" || !request || typeof request !== "object") return false
  if (!("method" in request) || typeof request.method !== "string") return false
  return request.method === "eth_accounts" ? isConnected() : ethereumMethods.has(request.method)
}
