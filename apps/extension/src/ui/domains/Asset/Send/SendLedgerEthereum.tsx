import { AccountJsonHardwareEthereum } from "@core/domains/accounts/types"
import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { tokensToPlanck } from "@core/util"
import { HexString } from "@polkadot/util/types"
import { api } from "@ui/api"
import LedgerEthereum from "@ui/domains/Sign/LedgerEthereum"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

import { useSendTokens } from "./context"
import { SendTokensData } from "./types"
import { useTransferableTokenById } from "./useTransferableTokens"

const SendLedgerEthereum = () => {
  const { formData, sendWithSignatureEthereum, cancel } = useSendTokens()
  const { from, to, transferableTokenId, amount, gasSettings } = formData as SendTokensData
  const account = useAccountByAddress(from) as AccountJsonHardwareEthereum
  const transferableToken = useTransferableTokenById(transferableTokenId)
  const { token, evmNetworkId } = transferableToken ?? {}

  const [error, setError] = useState<string>()
  const [transaction, setTransaction] = useState<ethers.providers.TransactionRequest>()

  const getTransaction = useCallback(async () => {
    if (!token || !evmNetworkId || !gasSettings) return

    const [nonce, txBase] = await Promise.all([
      api.ethGetTransactionsCount(account.address, evmNetworkId),
      getEthTransferTransactionBase(
        evmNetworkId,
        ethers.utils.getAddress(from),
        ethers.utils.getAddress(to),
        token,
        tokensToPlanck(amount, token.decimals)
      ),
    ])

    return {
      ...txBase,
      ...gasSettings,
      nonce,
    }
  }, [account.address, amount, evmNetworkId, from, gasSettings, to, token])

  useEffect(() => {
    getTransaction()
      .then(setTransaction)
      .catch((err) => {
        setError((err as Error).message)
      })
  }, [getTransaction])

  const [signed, setSigned] = useState(false)
  const handleSigned = useCallback(
    async ({ signature }: { signature: HexString }) => {
      try {
        setSigned(true)
        await sendWithSignatureEthereum(signature)
      } catch (err) {
        setError((err as Error).message)
      }
    },
    [sendWithSignatureEthereum]
  )

  const parent = useMemo(() => document.getElementById("send-funds-container"), [])

  if (error) return <div className="text-alert-error">{error}</div>

  // hide until ready or after it's signed
  if (!transaction || signed) return null

  return (
    <LedgerEthereum
      account={account}
      method="transaction"
      onReject={cancel}
      onSignature={handleSigned}
      payload={transaction}
      parent={parent}
    />
  )
}

// default export to allow lazy loading
export default SendLedgerEthereum
