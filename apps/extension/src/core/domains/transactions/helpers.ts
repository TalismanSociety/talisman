import { talismanAnalytics } from "@core/libs/Analytics"
import { roundToFirstInteger } from "@core/util/roundToFirstInteger"
import keyring from "@polkadot/ui-keyring"
import BigNumber from "bignumber.js"

import { addressBookStore } from "../app/store.addressBook"

type TransferAnalyticsBaseArgs = {
  toAddress: string
  amount: string
  tokenId: string
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
}: TransferAnalyticsEvmArgs | TransferAnalyticsSubstrateArgs) => {
  const isInternal = keyring.getAccount(toAddress) !== undefined
  const isContact = isInternal ? false : await addressBookStore.get(toAddress)
  talismanAnalytics.capture("asset transfer", {
    ...network,
    tokenId,
    amount: roundToFirstInteger(new BigNumber(amount).toNumber()),
    internal: isInternal || isContact,
    recipientType: isInternal ? "ownAccount" : isContact ? "contact" : "external",
  })
}
