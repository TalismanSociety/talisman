import { IdenticonType } from "@core/types"
import Identicon from "@polkadot/react-identicon"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { TalismanOrb } from "@talisman/components/TalismanOrb"
import * as ReactDOMServer from "react-dom/server"

const generateAccountAvatar = (address: string, iconType: IdenticonType) => {
  const component =
    iconType === "polkadot-identicon" ? (
      <Identicon value={address} theme={isEthereumAddress(address) ? "ethereum" : "polkadot"} />
    ) : (
      <TalismanOrb seed={address} />
    )

  const str = ReactDOMServer.renderToString(component)

  // blockies are rendered as img elements with base64 data, return as is
  const rawUri = /<img([^>]*?)src="([^"]*?)"/gi.exec(str)
  if (rawUri) {
    cache[address]
    return rawUri[2]
  }

  // polkadot identicons are rendered in a div and as svg but without namespace, so decoding breaks on the dapp unless we add it
  let [svg] = /<svg.*?<\/svg>/gi.exec(str ?? "")!
  if (!svg.includes("xmlns")) svg = svg.replace("<svg", "<svg xmlns='http://www.w3.org/2000/svg'")

  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`
}

const cache: Record<string, string> = {}

export const getAccountAvatar = (address: string, iconType: IdenticonType = "talisman-orb") => {
  const cacheKey = `${address}-${iconType}`
  if (!cache[cacheKey]) cache[cacheKey] = generateAccountAvatar(address, iconType)

  return cache[cacheKey]
}
