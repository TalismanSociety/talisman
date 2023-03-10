import {
  EvmWalletTransaction,
  SubWalletTransaction,
  WalletTransaction,
} from "@core/domains/recentTransactions/types"
import { notify } from "@talisman/components/Notifications"
import { RocketIcon, XOctagonIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { BigNumber, ethers } from "ethers"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import { Button, Drawer } from "talisman-ui"

import { TokensAndFiat } from "../Asset/TokensAndFiat"
import { EthFeeSelect } from "../Ethereum/GasSettings/EthFeeSelect"
import { useEthReplaceTransaction } from "../Ethereum/useEthReplaceTransaction"
import { useEthTransaction } from "../Ethereum/useEthTransaction"

type TxCancelDrawerProps = {
  tx?: WalletTransaction
  isOpen?: boolean
  onClose?: () => void
}

type EvmTxCancelProps = TxCancelDrawerProps & { tx: EvmWalletTransaction }
type SubTxCancelProps = TxCancelDrawerProps & { tx: SubWalletTransaction }

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
  } = useEthReplaceTransaction(tx.unsigned, "cancel", isLocked)

  const [isProcessing, setIsProcessing] = useState(false)

  const handleCancel = useCallback(async () => {
    if (!transaction) return
    setIsProcessing(true)
    try {
      await api.ethApproveSignAndSend(`eth-send.${tx.hash}-replace`, transaction)
      onClose?.()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("handleCancel", { err })
      notify({
        title: "Error",
        type: "error",
        subtitle: "Failed to cancel",
      })
    }
    setIsProcessing(false)
  }, [onClose, transaction, tx.hash])

  return (
    <>
      <XOctagonIcon className="text-brand-orange text-[40px]" />
      <div className="mt-12 text-base font-bold">Cancel Transaction</div>
      <p className="text-body-secondary mt-10 text-center text-sm">
        This will attempt to cancel your pending transaction, by replacing it with a zero-balance
        transfer with a higher priority.
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
          onClick={handleCancel}
          disabled={!isValid}
          processing={isProcessing}
        >
          Try to Cancel
        </Button>
      </div>
    </>
  )
}

const TxCancelEvm: FC<EvmTxCancelProps> = ({ tx, isOpen, onClose }) => {
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

export const TxCancelDrawer: FC<TxCancelDrawerProps> = ({ tx, ...props }) => {
  // tx needed to keep rendering after isOpen becomes false
  const [staleTx, setStaleTx] = useState<WalletTransaction>()
  useEffect(() => {
    if (tx) setStaleTx(tx)
  }, [tx])

  switch (staleTx?.networkType) {
    case "evm":
      return <TxCancelEvm tx={staleTx} {...props} />
    default:
      return null
  }
}
