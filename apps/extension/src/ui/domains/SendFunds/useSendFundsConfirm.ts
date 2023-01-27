import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { provideContext } from "@talisman/util/provideContext"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"

import { useEthTransaction } from "../Ethereum/useEthTransaction"

export const useSendFundsConfirmProvider = () => {
  const { tokenId, amount, from, to } = useSendFundsWizard()
  const token = useToken(tokenId)

  const { tip } = useTip(token?.chain?.id, true)

  const [tx, setTx] = useState<ethers.providers.TransactionRequest>()

  useEffect(() => {
    if (!isEvmToken(token) || !token.evmNetwork?.id || !from || !token || !amount || !to)
      setTx(undefined)
    else {
      getEthTransferTransactionBase(token.evmNetwork.id, from, to, token, amount)
        .then(setTx)
        .catch((err) => {
          setTx(undefined)
          // eslint-disable-next-line no-console
          console.error("EthTransactionFees", { err })
        })
    }
  }, [from, to, token, amount])

  const {
    transaction,
    priority,
    setPriority,
    txDetails,
    isLoading,
    gasSettings,
    error,
    gasSettingsByPriority,
    setCustomSettings,
    networkUsage,
  } = useEthTransaction(tx)

  const errorMessage = useMemo(() => {
    if (error?.startsWith("insufficient funds for intrinsic transaction cost"))
      return "Insufficient balance"
    return error ?? null
  }, [error])

  const ctx = useMemo(
    () => ({
      gasSettingsByPriority,
      setCustomSettings,
      setPriority,
      priority,
      txDetails,
      networkUsage,
      tx,
      isLoading,
      gasSettings,
      tip,
    }),
    [
      gasSettingsByPriority,
      isLoading,
      networkUsage,
      priority,
      setCustomSettings,
      setPriority,
      tx,
      txDetails,
      gasSettings,
      tip,
    ]
  )

  // useEffect(() => {
  //   console.log("ctx", ctx)
  // }, [ctx])

  return ctx
}

export const [SendFundsConfirmProvider, useSendFundsConfirm] = provideContext(
  useSendFundsConfirmProvider
)
