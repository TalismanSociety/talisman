import { isAccountOwned } from "@talismn/keyring"
import BigNumber from "bignumber.js"

import { talismanAnalytics } from "../../libs/Analytics"
import { privacyRoundCurrency } from "../../util/privacyRoundCurrency"
import { keyringStore } from "../keyring/store"

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
  // NOTE: This does not care if an account or contact is locked to one chain/network, while this transfer is on a different chain/network.
  // It will still consider isOwnAccount / isContact to be true.
  const account = await keyringStore.getAccount(toAddress)
  const isOwnAccount = isAccountOwned(account)
  const isContact = account?.type === "contact"

  talismanAnalytics.capture("asset transfer", {
    ...network,
    hardware,
    tokenId,
    amount: privacyRoundCurrency(new BigNumber(amount).toNumber()),
    internal: isOwnAccount || isContact,
    recipientType: isOwnAccount ? "ownAccount" : isContact ? "contact" : "external",
  })
}
