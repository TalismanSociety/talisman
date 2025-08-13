import { TALISMAN_LOGO_BASE64 } from "inject/shared/logo"

import { type EthProvider } from "./types"

interface EIP6963ProviderInfo {
  icon: string
  name: string
  rdns: string
  uuid: string
}

interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: EthProvider
}

const PROVIDER_INFO: EIP6963ProviderInfo = {
  icon: TALISMAN_LOGO_BASE64,
  name: "Talisman",
  rdns: "xyz.talisman",
  uuid: crypto.randomUUID(),
}

/*
 * Announce the provider to the page
 * https://eips.ethereum.org/EIPS/eip-6963
 */
export const announceProvider = (provider: EthProvider) => {
  const detail: EIP6963ProviderDetail = Object.freeze({ info: PROVIDER_INFO, provider })
  const event = new CustomEvent("eip6963:announceProvider", { detail })

  const broadcast = () => window.dispatchEvent(event)

  // respond to dapp requesting announcements
  window.addEventListener("eip6963:requestProvider", broadcast)

  // broadcast the provider immediately (in case Talisman injects after the dapp has requested announcements)
  broadcast()
}
