import { AccountJsonAny, AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { serializeTransactionRequestBigNumbers } from "@core/domains/ethereum/helpers"
import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
import { notify } from "@talisman/components/Notifications"
import { XOctagonIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { BigNumber } from "ethers"
import { FC, lazy, useCallback, useEffect, useState } from "react"
import { Button, Drawer } from "talisman-ui"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { useEthReplaceTransaction } from "../Ethereum/useEthReplaceTransaction"
import { TxReplaceType } from "./shared"

const LedgerEthereum = lazy(() => import("@ui/domains/Sign/LedgerEthereum"))

type TxReplaceDrawerProps = {
  tx?: WalletTransaction
  type?: TxReplaceType
  isOpen?: boolean
  onClose?: () => void
}

type EvmTxReplaceProps = TxReplaceDrawerProps & { tx: EvmWalletTransaction; type: TxReplaceType }
type SubTxReplaceProps = TxReplaceDrawerProps & { tx: SubWalletTransaction; type: TxReplaceType }

const TEXT = {
  title: {
    "speed-up": "Speed Up Transaction",
    "cancel": "Cancel Transaction",
  },
  description: {
    "speed-up":
      "This will attempt to speed up your pending transaction by resubmitting it with a higher priority.",
    "cancel":
      "This will attempt to cancel your pending transaction, by replacing it with a zero-balance transfer with a higher priority.",
  },
  approve: {
    "speed-up": "Speed Up",
    "cancel": "Try to Cancel",
  },
}

const EvmDrawerContent: FC<{
  tx: EvmWalletTransaction
  type: TxReplaceType
  onClose?: () => void
}> = ({ tx, type, onClose }) => {
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
    error,
    errorDetails,
  } = useEthReplaceTransaction(tx.unsigned, type, isLocked)

  const account = useAccountByAddress(tx.account)

  const [isProcessing, setIsProcessing] = useState(false)

  const handleSend = useCallback(async () => {
    if (!transaction) return
    setIsProcessing(true)
    try {
      const safeTx = serializeTransactionRequestBigNumbers(transaction)
      await api.ethSignAndSend(safeTx)
      api.analyticsCapture({
        eventName: `transaction ${type}`,
        options: {
          chainId: transaction.chainId,
          networkType: "ethereum",
        },
      })
      onClose?.()
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
        await api.ethSendSigned(safeTx, signature)
        api.analyticsCapture({
          eventName: `transaction ${type}`,
          options: {
            chainId: transaction.chainId,
            networkType: "ethereum",
          },
        })
        onClose?.()
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

  return (
    <>
      <XOctagonIcon className="text-brand-orange text-[40px]" />
      <div className="mt-12 text-base font-bold">{TEXT.title[type]}</div>
      <p className="text-body-secondary mt-10 text-center text-sm">{TEXT.description[type]}</p>
      <div className="text-body-secondary mt-16 w-full space-y-2 text-xs">
        <div className="flex w-full items-center justify-between">
          <div>Estimated Fee TODO</div>
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
        {account?.isHardware ? (
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
          <div className="mt-8 grid w-full grid-cols-2 gap-4">
            <Button className="h-24" onClick={onClose}>
              Close
            </Button>
            <Button
              className="h-24"
              primary
              onClick={handleSend}
              disabled={!account || (!isLoading && !isValid)}
              processing={isProcessing}
            >
              {TEXT.approve[type]}
            </Button>
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
