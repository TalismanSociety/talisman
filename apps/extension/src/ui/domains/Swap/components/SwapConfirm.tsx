import type { TokenId } from "@talismn/chaindata-provider"
import { ArrowDownIcon } from "@talismn/icons"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { AddressDisplay } from "@ui/domains/SendFunds/AddressDisplay"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import type { FC, ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { useSwapModal } from "../hooks/useSwapModal"
import { useSwap } from "../SwapProvider"
import { SwapConfirmActions } from "./SwapConfirmActions"

const CONTAINER_ID = "swap-modal-confirm"

export const SwapConfirm = () => {
  const { t } = useTranslation()
  const { close } = useSwapModal()

  const { fromTokenId, toTokenId, fromAmount, toAmount, fromAddress, toAddress, setSwapView } =
    useSwap()
  const fromToken = useToken(fromTokenId)
  const toToken = useToken(toTokenId)

  if (
    !fromToken ||
    !toToken ||
    !fromAddress ||
    !toAddress ||
    typeof fromAmount !== "bigint" ||
    typeof toAmount !== "bigint"
  )
    return null

  return (
    <WizardModalDialog
      className="size-full border-none"
      title={t("Confirm")}
      onBackClick={() => setSwapView("form")}
      onCloseClick={close}
      contentClassName="relative !overflow-hidden !p-0"
      id={CONTAINER_ID}
    >
      <div className="mb-44 flex h-full w-full flex-col items-center gap-8 overflow-y-auto overflow-x-hidden px-12">
        <div className="flex w-full flex-col gap-2 overflow-hidden pl-6">
          <TokenRow tokenId={fromToken.id} value={fromAmount} />
          <ArrowDownIcon className="ml-3 text-[20px] opacity-60" />
          <TokenRow tokenId={toToken.id} value={toAmount} />
        </div>

        <div className="flex w-full flex-col gap-2 rounded-lg bg-grey-900 px-8 py-6 text-xs">
          <AddressRow label={t("Sender")} address={fromAddress} networkId={fromToken.networkId} />
          <AddressRow label={t("Recipient")} address={toAddress} networkId={toToken.networkId} />
        </div>

        <SwapConfirmActions containerId={CONTAINER_ID} />
      </div>
    </WizardModalDialog>
  )
}

const TokenRow: FC<{ value: bigint; tokenId: TokenId }> = ({ tokenId, value }) => {
  const token = useToken(tokenId)
  const network = useNetworkById(token?.networkId)

  if (!token || !network) return null

  return (
    <div className="flex w-full items-center justify-between gap-8 overflow-hidden">
      <div className="relative shrink-0">
        <TokenLogo tokenId={tokenId} className="h-[32px] w-[32px] min-w-[32px] rounded-full" />
        <NetworkLogo
          className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 rounded-full border border-grey-900 text-[12px]"
          networkId={token.networkId}
        />
      </div>
      <div className="flex w-full flex-col gap-1 overflow-hidden">
        <TokensAndFiat
          tokenId={tokenId}
          planck={value}
          className="text-body-secondary text-sm"
          tokensClassName="text-body font-bold"
          noCountUp
        />
        <div className="flex w-full items-center gap-4 overflow-hidden text-sm">
          <div className="truncate text-body-secondary">{token.name || token.symbol}</div>
          <div className="flex shrink-0 items-center gap-[5px] rounded-full bg-grey-800 py-[4px] pr-[8px] pl-[5px]">
            <NetworkLogo className="text-[16px]" networkId={network.id} />
            <span className="truncate text-xs opacity-60">{network.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const AddressRow: FC<{ label: ReactNode; address: string; networkId: string }> = ({
  label,
  address,
  networkId,
}) => (
  <div className="flex h-11 items-center justify-between gap-4">
    <div className="text-body-secondary">{label}</div>
    <AddressDisplay
      address={address}
      networkId={networkId}
      className="text-xs"
      accountIconClassName="!text-md"
    />
  </div>
)
