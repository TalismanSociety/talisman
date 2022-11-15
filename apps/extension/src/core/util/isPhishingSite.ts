import { log } from "@core/log"
import { checkIfDenied as isPolkadotPhishingSite } from "@polkadot/phishing"
import isEthPhishingDomain from "eth-phishing-detect"
import * as Sentry from "@sentry/browser"

export const isPhishingSite = async (url: string) => {
  try {
    // not using urlToDomain because we need the hostname (host without the port)
    const domain = new URL(url).hostname

    const isEthereumDenied = isEthPhishingDomain(domain)
    const isPolkadotDenied = await isPolkadotPhishingSite(domain)

    if (isPolkadotDenied) log.log("Found on Polkadot phishing list", url)
    if (isEthereumDenied) log.log("Found on Ethereum phishing list", url)

    return isPolkadotDenied || isEthereumDenied
  } catch (err) {
    // if an error occurs, assume it's because of our check, don't block user
    log.error("Failed to check phishing url", { url, err })
    Sentry.captureException(err, { extra: { url } })
  }

  return false
}
