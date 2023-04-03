import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { serializeTransactionRequestBigNumbers } from "@core/domains/ethereum/helpers"
import { EthTransactionDetails } from "@core/domains/signing/types"
import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/transactions/types"
import { HexString } from "@polkadot/util/types"
import { notify } from "@talisman/components/Notifications"
import { AlertCircleIcon, InfoIcon, RocketIcon, XOctagonIcon } from "@talisman/theme/icons"
import { TokenId } from "@talismn/chaindata-provider"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { AnalyticsPage } from "@ui/api/analytics"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useBalance } from "@ui/hooks/useBalance"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { BigNumber } from "ethers"
import { ethers } from "ethers"
import { FC, lazy, useCallback, useEffect, useMemo, useState } from "react"
import { Button, Drawer } from "talisman-ui"
import { Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { useEthReplaceTransaction } from "../Ethereum/useEthReplaceTransaction"
import { TxReplaceType } from "./shared"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Popup",
  feature: "Transactions",
  featureVersion: 1,
  page: "Replace Transaction",
}

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

type TxReplaceDrawerProps = {
  tx?: WalletTransaction
  type?: TxReplaceType
  isOpen?: boolean
  onClose?: (newTxHash?: HexString) => void
}

type EvmTxReplaceProps = TxReplaceDrawerProps & { tx: EvmWalletTransaction; type: TxReplaceType }
type SubTxReplaceProps = TxReplaceDrawerProps & { tx: SubWalletTransaction; type: TxReplaceType }

export const EvmEstimatedFeeTooltip: FC<{
  account: string
  feeTokenId?: TokenId
  txDetails?: EthTransactionDetails
}> = ({ account, feeTokenId, txDetails }) => {
  const balance = useBalance(account, feeTokenId as string)

  if (!feeTokenId || !txDetails) return null

  return (
    <Tooltip>
      <TooltipTrigger>
        <InfoIcon className="inline align-text-top text-sm" />
      </TooltipTrigger>
      <TooltipContent>
        <div className="grid grid-cols-2 gap-2">
          <div>Estimated fee:</div>
          <div className="text-right">
            <TokensAndFiat
              planck={ethers.BigNumber.from(txDetails.estimatedFee).toBigInt()}
              tokenId={feeTokenId}
              noCountUp
            />
          </div>
          {!!txDetails?.maxFee && (
            <>
              <div>Max. fee:</div>
              <div className="text-right">
                <TokensAndFiat
                  planck={ethers.BigNumber.from(txDetails.maxFee).toBigInt()}
                  tokenId={feeTokenId}
                  noCountUp
                />
              </div>
            </>
          )}
          {!!balance && (
            <>
              <div>Balance:</div>
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

const EvmDrawerContent: FC<{
  tx: EvmWalletTransaction
  type: TxReplaceType
  onClose?: (newTxHash?: HexString) => void
}> = ({ tx, type, onClose }) => {
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
  } = useEthReplaceTransaction(tx.unsigned, type, isLocked)

  const account = useAccountByAddress(tx.account)

  const [isProcessing, setIsProcessing] = useState(false)

  const handleSend = useCallback(async () => {
    if (!transaction) return
    setIsProcessing(true)
    try {
      const safeTx = serializeTransactionRequestBigNumbers(transaction)
      const newHash = await api.ethSignAndSend(safeTx)
      api.analyticsCapture({
        eventName: `transaction ${type}`,
        options: {
          chainId: transaction.chainId,
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
          (err as any)?.message === "nonce too low"
            ? "Transaction already confirmed"
            : `Failed to ${type}`,
      })
    }
    setIsProcessing(false)
  }, [onClose, transaction, type])

  const handleSendSigned = useCallback(
    async ({ signature }: { signature: `0x${string}` }) => {
      if (!transaction) return
      setIsProcessing(true)
      try {
        const safeTx = serializeTransactionRequestBigNumbers(transaction)
        const newHash = await api.ethSendSigned(safeTx, signature)
        api.analyticsCapture({
          eventName: `transaction ${type}`,
          options: {
            chainId: transaction.chainId,
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
            (err as any)?.message === "nonce too low"
              ? "Transaction already confirmed"
              : `Failed to ${type}`,
        })
      }
      setIsProcessing(false)
    },
    [onClose, transaction, type]
  )

  const handleSendToLedger = useCallback(() => {
    setIsLocked(true)
  }, [])

  const { canReplace, Icon, iconClassName, title, description, approveText } = useMemo(() => {
    const canReplace = tx.status === "pending"

    if (canReplace && type === "speed-up")
      return {
        canReplace,
        Icon: RocketIcon,
        iconClassName: "text-primary",
        title: "Speed Up Transaction",
        description:
          "This will attempt to speed up your pending transaction by resubmitting it with a higher priority.",
        approveText: "Speed Up",
      }

    if (canReplace && type === "cancel")
      return {
        canReplace,
        Icon: XOctagonIcon,
        iconClassName: "text-brand-orange",
        title: "Cancel Transaction",
        description:
          "This will attempt to cancel your pending transaction, by replacing it with a zero-balance transfer with a higher priority.",
        approveText: "Try to Cancel",
      }

    return {
      canReplace,
      Icon: AlertCircleIcon,
      iconClassName: "text-alert-warn",
      title: "Transaction already confirmed",
      description: "This transaction has already been confirmed and can no longer be replaced.",
      approveText: undefined,
    }
  }, [tx.status, type])

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
            Estimated Fee{" "}
            <EvmEstimatedFeeTooltip
              account={tx.account}
              feeTokenId={evmNetwork?.nativeToken?.id}
              txDetails={txDetails}
            />
          </div>
          <div>Priority</div>
        </div>
        <div className="flex h-12 w-full items-center justify-between">
          <div>
            {txDetails?.estimatedFee ? (
              <TokensAndFiat
                planck={BigNumber.from(txDetails.estimatedFee).toString()}
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
            <LedgerEthereum
              manualSend
              className="mt-6"
              method="transaction"
              payload={transaction}
              account={account as AccountJsonHardwareEthereum}
              onSignature={handleSendSigned}
              onReject={() => onClose?.()}
              onSendToLedger={handleSendToLedger}
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
              Close
            </Button>
            {canReplace && (
              <Button
                className="h-24"
                primary
                onClick={handleSend}
                disabled={!account || (!isLoading && !isValid)}
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

const TxReplaceEvm: FC<EvmTxReplaceProps> = ({ tx, type, isOpen, onClose }) => {
  // must render once before turning isOpen to true or transition won't happen
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)

    return () => {
      setIsMounted(false)
    }
  }, [tx, type])

  return (
    <Drawer
      isOpen={isMounted && !!isOpen}
      anchor="bottom"
      containerId="main"
      onDismiss={onClose}
      className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12"
    >
      <EvmDrawerContent tx={tx} type={type} onClose={onClose} />
    </Drawer>
  )
}

export const TxReplaceDrawer: FC<TxReplaceDrawerProps> = ({ tx, type, ...props }) => {
  // tx needed to keep rendering after isOpen becomes false to ensure nice slide out transition
  const [stale, setStale] = useState<{ tx: WalletTransaction; type: TxReplaceType }>()
  useEffect(() => {
    if (tx && type) setStale({ tx, type })
  }, [tx, type])

  switch (stale?.tx?.networkType) {
    case "evm":
      return <TxReplaceEvm tx={stale.tx} type={stale.type} {...props} />
    default:
      return null
  }
}
