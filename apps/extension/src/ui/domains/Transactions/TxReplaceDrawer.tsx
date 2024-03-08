import { EvmWalletTransaction, WalletTransaction } from "@extension/core"
import { serializeTransactionRequest } from "@extension/core"
import { EthTransactionDetails } from "@extension/core"
import { HexString } from "@polkadot/util/types"
import { notify } from "@talisman/components/Notifications"
import { TokenId } from "@talismn/chaindata-provider"
import { AlertCircleIcon, InfoIcon, RocketIcon, XOctagonIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import { useAccountByAddress } from "@ui/hooks/useAccountByAddress"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useBalance } from "@ui/hooks/useBalance"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button, Drawer, useOpenCloseWithData } from "talisman-ui"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { useEthReplaceTransaction } from "../Ethereum/useEthReplaceTransaction"
import { SignHardwareEthereum } from "../Sign/SignHardwareEthereum"
import { TxReplaceType } from "./types"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Transactions",
  featureVersion: 1,
  page: "Replace Transaction",
}

type TxReplaceDrawerProps = {
  tx?: WalletTransaction
  type?: TxReplaceType // will open if set
  onClose?: (newTxHash?: HexString) => void
}

export const EvmEstimatedFeeTooltip: FC<{
  account: string
  feeTokenId?: TokenId
  txDetails?: EthTransactionDetails
}> = ({ account, feeTokenId, txDetails }) => {
  const { t } = useTranslation("request")
  const balance = useBalance(account, feeTokenId as string)

  if (!feeTokenId || !txDetails) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="inline align-text-top text-sm" />
      </TooltipTrigger>
      <TooltipContent>
        <div className="grid grid-cols-2 gap-2">
          <div>{t("Estimated fee:")}</div>
          <div className="text-right">
            <TokensAndFiat planck={txDetails.estimatedFee} tokenId={feeTokenId} noCountUp />
          </div>
          {!!txDetails?.maxFee && (
            <>
              <div>{t("Max. fee:")}</div>
              <div className="text-right">
                <TokensAndFiat planck={txDetails.maxFee} tokenId={feeTokenId} noCountUp />
              </div>
            </>
          )}
          {!!balance && (
            <>
              <div>{t("Balance:")}</div>
              <div className="text-right">
                <TokensAndFiat
                  planck={balance.transferable.planck}
                  tokenId={feeTokenId}
                  noCountUp
                />
              </div>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

const getTransferInfo = (tx: EvmWalletTransaction) => {
  return tx.value && tx.tokenId && tx.to
    ? { value: tx.value, tokenId: tx.tokenId, to: tx.to }
    : undefined
}

const EvmDrawerContent: FC<{
  tx: EvmWalletTransaction
  type: TxReplaceType
  onClose?: (newTxHash?: HexString) => void
}> = ({ tx, type, onClose }) => {
  const { t } = useTranslation("request")
  const analyticsProps = useMemo(
    () => ({
      evmNetworkId: tx.evmNetworkId,
      networkType: "ethereum",
    }),
    [tx.evmNetworkId]
  )
  useAnalyticsPageView(ANALYTICS_PAGE, analyticsProps)

  const evmNetwork = useEvmNetwork(tx.evmNetworkId)
  const [isLocked, setIsLocked] = useState(false)
  const {
    transaction,
    txDetails,
    priority,
    gasSettingsByPriority,
    setCustomSettings,
    setPriority,
    networkUsage,
    isLoading,
    isValid,
  } = useEthReplaceTransaction(tx.unsigned, tx.evmNetworkId, type, isLocked)

  const account = useAccountByAddress(tx.account)

  const [isProcessing, setIsProcessing] = useState(false)

  const handleSend = useCallback(async () => {
    if (!transaction) return
    setIsProcessing(true)
    try {
      const transferInfo = getTransferInfo(tx)
      const serialized = serializeTransactionRequest(transaction)
      const newHash = await api.ethSignAndSend(tx.evmNetworkId, serialized, transferInfo)
      api.analyticsCapture({
        eventName: `transaction ${type}`,
        options: {
          chainId: Number(tx.evmNetworkId),
          networkType: "ethereum",
        },
      })
      onClose?.(newHash)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleSend", { err })
      notify({
        title: `Failed to ${type}`,
        type: "error",
        subtitle:
          (err as Error)?.message === "nonce too low"
            ? t("Transaction already confirmed")
            : t(`Failed to {{type}}`, { type }),
      })
    }
    setIsProcessing(false)
  }, [onClose, transaction, tx, type, t])

  const handleSendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction) return
      setIsProcessing(true)
      try {
        const transferInfo = getTransferInfo(tx)
        const serialized = serializeTransactionRequest(transaction)
        const newHash = await api.ethSendSigned(
          tx.evmNetworkId,
          serialized,
          signature,
          transferInfo
        )
        api.analyticsCapture({
          eventName: `transaction ${type}`,
          options: {
            chainId: Number(tx.evmNetworkId),
            networkType: "ethereum",
          },
        })
        onClose?.(newHash)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("handleSend", { err })
        notify({
          title: t(`Failed to {{type}}`, { type }),
          type: "error",
          subtitle:
            (err as Error)?.message === "nonce too low"
              ? t("Transaction already confirmed")
              : t(`Failed to {{type}}`, { type }),
        })
      }
      setIsProcessing(false)
    },
    [onClose, t, transaction, tx, type]
  )

  const handleSentToDevice = useCallback(() => {
    setIsLocked(true)
  }, [])

  const { canReplace, Icon, iconClassName, title, description, approveText } = useMemo(() => {
    const canReplace = tx.status === "pending"

    if (canReplace && type === "speed-up")
      return {
        canReplace,
        Icon: RocketIcon,
        iconClassName: "text-primary",
        title: t("Speed Up Transaction"),
        description: t(
          "This will attempt to speed up your pending transaction by resubmitting it with a higher priority."
        ),
        approveText: t("Speed Up"),
      }

    if (canReplace && type === "cancel")
      return {
        canReplace,
        Icon: XOctagonIcon,
        iconClassName: "text-brand-orange",
        title: t("Cancel Transaction"),
        description: t(
          "This will attempt to cancel your pending transaction, by replacing it with a zero-balance transfer with a higher priority."
        ),
        approveText: t("Try to Cancel"),
      }

    return {
      canReplace,
      Icon: AlertCircleIcon,
      iconClassName: "text-alert-warn",
      title: t("Transaction already confirmed"),
      description: t("This transaction has already been confirmed and can no longer be replaced."),
      approveText: undefined,
    }
  }, [tx.status, type, t])

  return (
    <>
      <Icon className={classNames("text-[40px]", iconClassName)} />
      <div className="mt-12 text-base font-bold">{title}</div>
      <p className="text-body-secondary mt-10 text-center text-sm">{description}</p>
      <div
        className={classNames(
          "text-body-secondary mt-16 w-full space-y-2 text-xs",
          !canReplace && "pointer-events-none opacity-50"
        )}
      >
        <div className="flex w-full items-center justify-between">
          <div>
            {t("Estimated Fee")}{" "}
            <EvmEstimatedFeeTooltip
              account={tx.account}
              feeTokenId={evmNetwork?.nativeToken?.id}
              txDetails={txDetails}
            />
          </div>
          <div>{t("Priority")}</div>
        </div>
        <div className="flex h-12 w-full items-center justify-between">
          <div>
            {txDetails?.estimatedFee ? (
              <TokensAndFiat
                planck={txDetails.estimatedFee}
                tokenId={evmNetwork?.nativeToken?.id}
              />
            ) : null}
          </div>
          <div>
            {evmNetwork?.nativeToken && txDetails && transaction && (
              <EthFeeSelect
                tokenId={evmNetwork.nativeToken.id}
                drawerContainerId={"main"}
                gasSettingsByPriority={gasSettingsByPriority}
                setCustomSettings={setCustomSettings}
                onChange={setPriority}
                priority={priority}
                txDetails={txDetails}
                networkUsage={networkUsage}
                tx={transaction}
                className="bg-grey-750"
              />
            )}
          </div>
        </div>
      </div>
      <>
        {canReplace && account?.isHardware ? (
          <div className="w-full">
            <SignHardwareEthereum
              className="mt-6"
              account={account}
              method="eth_sendTransaction"
              payload={transaction}
              onSigned={handleSendSigned}
              onCancel={() => onClose?.()}
              onSentToDevice={handleSentToDevice}
              containerId="main"
            />
          </div>
        ) : (
          <div
            className={classNames(
              "mt-8 grid w-full  gap-4",
              canReplace ? "grid-cols-2" : "grid-cols-1"
            )}
          >
            <Button className="h-24" onClick={() => onClose?.()}>
              {t("Close")}
            </Button>
            {canReplace && (
              <Button
                className="h-24"
                primary
                onClick={handleSend}
                disabled={!isProcessing && (!transaction || !account || (!isLoading && !isValid))}
                processing={isProcessing}
              >
                {approveText}
              </Button>
            )}
          </div>
        )}
      </>
    </>
  )
}

export const TxReplaceDrawer: FC<TxReplaceDrawerProps> = ({ tx, type, onClose }) => {
  const inputs = useMemo(() => (tx && type ? { tx, type } : undefined), [tx, type])
  const { isOpenReady, data } = useOpenCloseWithData(!!inputs, inputs)

  return (
    <Drawer
      isOpen={isOpenReady}
      anchor="bottom"
      containerId="main"
      onDismiss={onClose}
      className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12"
    >
      {data?.type && data?.tx?.networkType === "evm" ? (
        <EvmDrawerContent tx={data.tx} type={data.type} onClose={onClose} />
      ) : null}
    </Drawer>
  )
}
