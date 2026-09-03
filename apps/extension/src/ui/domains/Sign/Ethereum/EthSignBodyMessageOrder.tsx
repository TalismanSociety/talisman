import type { Account } from "@core/domains/keyring/exports"
import type { EthNetwork } from "@talismn/chaindata-provider"
import { formatDecimals } from "@talismn/util"
import type {
  DecodedTypedDataOrder,
  TypedDataOrderItem,
} from "@ui/domains/Ethereum/util/decodeEvmTypedData"
import { useToken } from "@ui/state/chaindata"
import type { FC } from "react"
import { useTranslation } from "react-i18next"
import { formatUnits, zeroAddress } from "viem"

import { SignAlertMessage } from "../SignAlertMessage"
import { useEvmTokenInfo } from "./hooks/useEvmTokenInfo"
import { SignParamAccountButton, SignParamNetworkAddressButton } from "./shared"
import { getExpiryInfo } from "./shared/expiry"
import { SignParamErc20TokenButton } from "./shared/SignParamErc20TokenButton"

const getItemKey = (item: TypedDataOrderItem) =>
  `${item.token}-${item.identifier}-${item.amount}-${item.recipient}`

const OrderItem: FC<{ item: TypedDataOrderItem; network: EthNetwork }> = ({ item, network }) => {
  const { t } = useTranslation()
  const isNative = item.token === zeroAddress
  const nativeToken = useToken(network.nativeTokenId)
  const { token: erc20Token } = useEvmTokenInfo(
    network.id,
    isNative || item.isNft ? undefined : item.token
  )
  const token = isNative ? nativeToken : erc20Token

  if (item.isNft)
    return (
      <div className="flex items-center">
        {/* erc1155 items carry a quantity, erc721 ones are always a single token */}
        {item.amount !== 1n && <span className="pl-4 text-white">{item.amount.toString()} ×</span>}
        <SignParamNetworkAddressButton network={network} address={item.token} />
        <span className="px-4 text-white">
          {item.identifier === undefined ? t("any item") : `#${item.identifier}`}
        </span>
      </div>
    )

  return (
    <div className="flex items-center">
      <span className="px-4 text-white">
        {token ? formatDecimals(formatUnits(item.amount, token.decimals)) : item.amount.toString()}
      </span>
      {isNative ? (
        <span>{token?.symbol ?? t("native token")}</span>
      ) : token?.symbol ? (
        <SignParamErc20TokenButton address={item.token} asset={token} network={network} withIcon />
      ) : (
        <SignParamNetworkAddressButton network={network} address={item.token} />
      )}
    </div>
  )
}

export const EthSignBodyMessageOrder: FC<{
  account: Account
  network: EthNetwork
  order: DecodedTypedDataOrder
}> = ({ account, network, order }) => {
  const { t } = useTranslation()

  const expiry = getExpiryInfo(order.deadline)
  // consideration items paid to anyone else are fees, only what comes back to the signer is theirs
  const proceeds = order.consideration.filter(
    (item) => item.recipient?.toLowerCase() === account.address.toLowerCase()
  )

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="flex w-full flex-col items-center leading-base">
        <div className="flex p-1">
          <div>{t("You send")}</div>
        </div>
        {order.offer.map((item) => (
          <OrderItem key={getItemKey(item)} item={item} network={network} />
        ))}
        <div className="flex p-1">
          <div>{t("You receive")}</div>
        </div>
        {proceeds.length ? (
          proceeds.map((item) => <OrderItem key={getItemKey(item)} item={item} network={network} />)
        ) : (
          <span className="px-4 text-white">{t("nothing")}</span>
        )}
        <div className="flex p-1">
          <div>{t("from")}</div>
          <SignParamAccountButton
            address={account.address}
            explorerUrl={network.blockExplorerUrls[0]}
          />
        </div>
        <div className="flex p-1">
          <div>{t("expires")}</div>
          <span className="px-4 text-white">
            {expiry.date ? expiry.date.toLocaleString() : t("never")}
          </span>
        </div>
      </div>
      <SignAlertMessage type={proceeds.length ? "warning" : "error"}>
        {proceeds.length
          ? t(
              "This signature lets anyone take the assets you send, in exchange for what you receive, with no further approval from you."
            )
          : t(
              "This signature lets anyone take the assets you send, and pays you nothing in return."
            )}
      </SignAlertMessage>
    </div>
  )
}
