import { serializeTransactionRequestBigNumbers } from "@core/domains/ethereum/helpers"
import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
import { notify } from "@talisman/components/Notifications"
import { RocketIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { BigNumber } from "ethers"
import { FC, useCallback, useEffect, useState } from "react"
import { Button, Drawer } from "talisman-ui"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { useEthReplaceTransaction } from "../Ethereum/useEthReplaceTransaction"

type TxSpeedUpDrawerProps = {
  tx?: WalletTransaction
  isOpen?: boolean
  onClose?: () => void
}

type EvmTxSpeedUpProps = TxSpeedUpDrawerProps & { tx: EvmWalletTransaction }
type SubTxSpeedUpProps = TxSpeedUpDrawerProps & { tx: SubWalletTransaction }

const EvmDrawerContent: FC<{
  tx: EvmWalletTransaction
  onClose?: () => void
}> = ({ tx, onClose }) => {
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
  } = useEthReplaceTransaction(tx.unsigned, "speed-up", isLocked)

  const [isProcessing, setIsProcessing] = useState(false)

  const handleSend = useCallback(async () => {
    if (!transaction) return
    setIsProcessing(true)
    try {
      const safeTx = serializeTransactionRequestBigNumbers(transaction)
      await api.ethSignAndSend(safeTx)
      api.analyticsCapture({
        eventName: "transaction speed up",
        options: {
          chainId: transaction.chainId,
        },
      })
      onClose?.()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleSend", { err })
      notify({
        title: "Failed to speed up",
        type: "error",
        subtitle:
          (err as any)?.message === "nonce too low"
            ? "Transaction already confirmed"
            : "Failed to cancel",
      })
    }
    setIsProcessing(false)
  }, [onClose, transaction])

  return (
    <>
      <RocketIcon className="text-primary text-[40px]" />
      <div className="mt-12 text-base font-bold">Speed Up Transaction</div>
      <p className="text-body-secondary mt-10 text-center text-sm">
        This will attempt to speed up your pending transaction by resubmitting it with a higher
        priority.
      </p>
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
      <div className="mt-8 grid w-full grid-cols-2 gap-4">
        <Button className="h-24" onClick={onClose}>
          Close
        </Button>
        <Button
          className="h-24"
          primary
          onClick={handleSend}
          disabled={!isLoading && !isValid}
          processing={isProcessing}
        >
          Try to Speed Up
        </Button>
      </div>
    </>
  )
}

const TxSpeedUpEvm: FC<EvmTxSpeedUpProps> = ({ tx, isOpen, onClose }) => {
  // must render once before turning isOpen to true or transition won't happen
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(!!tx)

    return () => {
      setIsMounted(false)
    }
  }, [tx])

  return (
    <Drawer
      isOpen={isMounted && !!isOpen}
      anchor="bottom"
      containerId="main"
      onDismiss={onClose}
      className="bg-grey-800 flex w-full flex-col items-center rounded-t-xl p-12"
    >
      <EvmDrawerContent tx={tx} onClose={onClose} />
    </Drawer>
  )
}

export const TxSpeedUpDrawer: FC<TxSpeedUpDrawerProps> = ({ tx, ...props }) => {
  // tx needed to keep rendering after isOpen becomes false
  const [staleTx, setStaleTx] = useState<WalletTransaction>()
  useEffect(() => {
    if (tx) setStaleTx(tx)
  }, [tx])

  switch (staleTx?.networkType) {
    case "evm":
      return <TxSpeedUpEvm tx={staleTx} {...props} />
    default:
      return null
  }
}
