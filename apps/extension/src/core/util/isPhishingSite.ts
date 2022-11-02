import { log } from "@core/log"
import { checkIfDenied as isPolkadotPhishingSite } from "@polkadot/phishing"
import isEthPhishingDomain from "eth-phishing-detect"

// not using urlToDomain because we need the hostname (host without the port)
const getDomainFromUrl = (url: string) => {
  try {
    const objUrl = new URL(url)
    return objUrl.hostname
  } catch (err) {
    return null
  }
}

export const isPhishingSite = async (url: string) => {
  const domain = getDomainFromUrl(url)
  if (!domain) return false

  const isEthereumDenied = isEthPhishingDomain(domain)
  const isPolkadotDenied = await isPolkadotPhishingSite(domain)

  if (isPolkadotDenied) log.log("Found on Polkadot phishing list", url)
  if (isEthereumDenied) log.log("Found on Ethereum phishing list", url)

  return isPolkadotDenied || isEthereumDenied
}
