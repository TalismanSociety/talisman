import keyring from "@polkadot/ui-keyring"
import BigNumber from "bignumber.js"

import { talismanAnalytics } from "../../libs/Analytics"
import { roundToFirstInteger } from "../../util/roundToFirstInteger"
import { addressBookStore } from "../app/store.addressBook"

type TransferAnalyticsBaseArgs = {
  toAddress: string
  amount: string
  tokenId: string
  hardware?: boolean
}

type TransferAnalyticsEvmArgs = TransferAnalyticsBaseArgs & {
  network: { evmNetworkId: string }
}

type TransferAnalyticsSubstrateArgs = TransferAnalyticsBaseArgs & {
  network: { chainId: string }
}

export const transferAnalytics = async ({
  toAddress,
  amount,
  tokenId,
  network,
  hardware = false,
}: TransferAnalyticsEvmArgs | TransferAnalyticsSubstrateArgs) => {
  const isOwnAccount = keyring.getAccount(toAddress) !== undefined
  const isContact = isOwnAccount ? false : (await addressBookStore.get(toAddress)) !== undefined

  talismanAnalytics.capture("asset transfer", {
    ...network,
    hardware,
    tokenId,
    amount: roundToFirstInteger(new BigNumber(amount).toNumber()),
    internal: isOwnAccount || isContact,
    recipientType: isOwnAccount ? "ownAccount" : isContact ? "contact" : "external",
  })
}
