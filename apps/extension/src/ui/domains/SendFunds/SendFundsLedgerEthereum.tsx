import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { HexString } from "@polkadot/util/types"
import { tokensToPlanck } from "@talismn/util"
import { api } from "@ui/api"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import LedgerEthereum from "@ui/domains/Sign/LedgerEthereum"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "talisman-ui"

import { useSendFunds } from "./useSendFunds"

const SendFundsLedgerEthereum = () => {
  const { tokenId, from, to, amount } = useSendFundsWizard()
  const { evmTransaction, sendWithSignature, isLocked, setIsLocked } = useSendFunds()
  // const { formData, sendWithSignatureEthereum, cancel } = useSendTokens()
  // const { from, to, transferableTokenId, amount, gasSettings } = formData as SendTokensData
  const account = useAccountByAddress(from) as AccountJsonHardwareEthereum
  // const transferableToken = useTransferableTokenById(transferableTokenId)
  // const { token, evmNetworkId } = transferableToken ?? {}

  const [error, setError] = useState<Error>()
  // const [transaction, setTransaction] = useState<ethers.providers.TransactionRequest>()

  // const getTransaction = useCallback(async () => {
  //   if (!token || !evmNetworkId || !gasSettings) return

  //   const [nonce, txBase] = await Promise.all([
  //     api.ethGetTransactionsCount(account.address, evmNetworkId),
  //     getEthTransferTransactionBase(
  //       evmNetworkId,
  //       ethers.utils.getAddress(from),
  //       ethers.utils.getAddress(to),
  //       token,
  //       tokensToPlanck(amount, token.decimals)
  //     ),
  //   ])

  //   return {
  //     ...txBase,
  //     ...gasSettings,
  //     nonce,
  //   }
  // }, [account.address, amount, evmNetworkId, from, gasSettings, to, token])

  // useEffect(() => {
  //   getTransaction()
  //     .then(setTransaction)
  //     .catch((err) => {
  //       setError(err as Error)
  //     })
  // }, [getTransaction])

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      try {
        setSigned(true)
        await sendWithSignature(signature)
      } catch (err) {
        setError(err as Error)
      }
    },
    [sendWithSignature]
  )

  const sendToLedger = useCallback(
    (send: boolean) => () => {
      setIsLocked(send)
    },
    [setIsLocked]
  )

  const parent = useMemo(() => document.getElementById("send-funds-container"), [])

  if (error) return <div className="text-alert-error">{error.message}</div>

  if (!isLocked || signed)
    return (
      <Button
        disabled={!evmTransaction}
        className="mt-12 w-full"
        primary
        onClick={sendToLedger(true)}
        processing={signed}
      >
        Send to Ledger
      </Button>
    )

  // hide until ready or after it's signed
  if (!evmTransaction) return null

  return (
    <LedgerEthereum
      account={account}
      method="transaction"
      onReject={sendToLedger(false)}
      onSignature={handleSigned}
      payload={evmTransaction.transaction}
      parent={parent}
    />
  )
}

// default export to allow lazy loading
export default SendFundsLedgerEthereum
