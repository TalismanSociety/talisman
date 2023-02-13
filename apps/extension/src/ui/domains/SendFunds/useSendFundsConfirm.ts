import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { log } from "@core/log"
import { HexString } from "@polkadot/util/types"
import { provideContext } from "@talisman/util/provideContext"
import { useQuery } from "@tanstack/react-query"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { useTip } from "@ui/hooks/useTip"
import useToken from "@ui/hooks/useToken"
import { isEvmToken } from "@ui/util/isEvmToken"
import { isSubToken } from "@ui/util/isSubToken"
import { ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useEthTransaction } from "../Ethereum/useEthTransaction"

type SignMethod = "normal" | "ledgerSubstrate" | "ledgerEthereum" | "unknown"

const useEvmTransaction = (
  tokenId?: string,
  from?: string,
  to?: string,
  amount?: string,
  isLocked?: boolean
) => {
  const token = useToken(tokenId)

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

  const result = useEthTransaction(tx, isLocked)

  // const evmErrorMessage = useMemo(() => {
  //   if (error?.startsWith("insufficient funds for intrinsic transaction cost"))
  //     return "Insufficient balance"
  //   return error ?? null
  // }, [error])

  return tx ? { tx, ...result } : undefined
}

const useSubTransaction = (
  tokenId?: string,
  from?: string,
  to?: string,
  amount?: string,
  tip?: string,
  allowReap?: boolean,
  isLocked?: boolean
) => {
  const token = useToken(tokenId)

  const qSubstrateEstimateFee = useQuery({
    queryKey: ["estimateFee", from, to, token?.id, amount, tip, allowReap],
    queryFn: async () => {
      if (!token?.chain?.id || !from || !to || !amount) return null
      const { partialFee, unsigned, pendingTransferId } = await api.assetTransferCheckFees(
        token.chain.id,
        token.id,
        from,
        to,
        amount,
        tip ?? "0",
        allowReap
      )
      return { partialFee, unsigned, pendingTransferId }
    },
    refetchInterval: 10_000,
    enabled: !isLocked,
  })

  return qSubstrateEstimateFee.data ?? undefined
}

export const useSendFundsConfirmProvider = () => {
  const { tokenId, amount, from, to, allowReap, gotoProgress } = useSendFundsWizard()
  const token = useToken(tokenId)
  const account = useAccountByAddress(from)

  // lock sending payload to hardware device for signing
  const [isLocked, setIsLocked] = useState(false)

  const { tip } = useTip(token?.chain?.id, !isLocked)

  const evmTransaction = useEvmTransaction(tokenId, from, to, amount, isLocked)
  const subTransaction = useSubTransaction(tokenId, from, to, amount, tip, allowReap, isLocked)

  const signMethod: SignMethod = useMemo(() => {
    if (!account || !token) return "unknown"
    if (account?.isHardware) {
      if (isSubToken(token)) return "ledgerSubstrate"
      else if (isEvmToken(token)) return "ledgerEthereum"
      else throw new Error("Unknown token type")
    }
    return "normal"
  }, [account, token])

  // Button should enable 1 second after the form shows up, to prevent sending funds accidentaly by double clicking the review button on previous screen
  const [isReady, setIsReady] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsReady(true)
    }, 1_000)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  const send = useCallback(async () => {
    try {
      if (!from) throw new Error("Sender not found")
      if (!to) throw new Error("Recipient not found")
      if (!amount) throw new Error("Amount not found")
      if (!token) throw new Error("Token not found")

      setIsProcessing(true)

      if (token.chain?.id) {
        const { id } = await api.assetTransfer(
          token.chain.id,
          token.id,
          from,
          to,
          amount,
          tip ?? "0",
          allowReap
        )
        gotoProgress({ substrateTxId: id })
      } else if (token.evmNetwork?.id) {
        if (!evmTransaction?.gasSettings) throw new Error("Missing gas settings")
        const { hash } = await api.assetTransferEth(
          token.evmNetwork.id,
          token.id,
          from,
          to,
          amount,
          evmTransaction.gasSettings
        )
        gotoProgress({ evmNetworkId: token.evmNetwork.id, evmTxHash: hash })
      } else throw new Error("Unknown network")
    } catch (err) {
      log.error("Failed to submit tx", err)
      setErrorMessage((err as Error).message)
      setIsProcessing(false)
    }
  }, [allowReap, amount, evmTransaction?.gasSettings, from, gotoProgress, tip, to, token])

  const sendWithSignature = useCallback(
    async (signature: HexString) => {
      try {
        setIsProcessing(true)
        if (subTransaction?.pendingTransferId) {
          const transfer = await api.assetTransferApproveSign(
            subTransaction.pendingTransferId,
            signature
          )
          gotoProgress({ substrateTxId: transfer.id })
          return
        }
        throw new Error("Unknown transaction")
      } catch (err) {
        setErrorMessage((err as Error).message)
        setIsProcessing(false)
      }
    },
    [gotoProgress, subTransaction?.pendingTransferId]
  )

  const ctx = useMemo(
    () => ({
      evmTransaction,
      subTransaction,
      tip,
      signMethod,
      isReady,
      errorMessage,
      isProcessing,
      send,
      sendWithSignature,
      isLocked,
      setIsLocked,
    }),
    [
      evmTransaction,
      subTransaction,
      tip,
      signMethod,
      isReady,
      errorMessage,
      isProcessing,
      send,
      sendWithSignature,
      isLocked,
    ]
  )

  return ctx
}

export const [SendFundsConfirmProvider, useSendFundsConfirm] = provideContext(
  useSendFundsConfirmProvider
)
