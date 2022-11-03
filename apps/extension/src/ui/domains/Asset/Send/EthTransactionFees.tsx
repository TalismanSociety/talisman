import { BalanceFormatter } from "@core/domains/balances/types"
import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { EthGasSettings } from "@core/domains/ethereum/types"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { Box } from "@talisman/components/Box"
import { LoaderIcon } from "@talisman/theme/icons"
import { tokensToPlanck } from "@talismn/util"
import { EthFeeSelect } from "@ui/domains/Ethereum/EthFeeSelect"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { ethers } from "ethers"
import { useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import { useEthTransaction } from "../../Ethereum/useEthTransaction"
import Fiat from "../Fiat"
import Tokens from "../Tokens"
import { useTransferableTokenById } from "./useTransferableTokens"

export const Loader = styled(LoaderIcon)`
  font-size: 1.8rem;
`

export type FeeSettings = {
  priority?: EthPriorityOptionName
  gasSettings?: EthGasSettings
}

type EthTransactionFeesProps = {
  transferableTokenId?: string
  amount: string
  from: string
  to: string
  onChange?: (fees: FeeSettings) => void
}

/**
 * This component should only be rendered if the selected chain is EVM
 * All EVM gas computation should be done from here
 */
export const EthTransactionFees = ({
  transferableTokenId,
  amount, // ethers
  from,
  to,
  onChange,
}: EthTransactionFeesProps) => {
  const transferableToken = useTransferableTokenById(transferableTokenId)
  const token = useToken(transferableToken?.token?.id)
  const evmNetwork = useEvmNetwork(transferableToken?.evmNetworkId)
  const nativeToken = useToken(evmNetwork?.nativeToken?.id)

  const [tx, setTx] = useState<ethers.providers.TransactionRequest>()

  useEffect(() => {
    if (!transferableToken?.evmNetworkId || !token || !amount || !to) setTx(undefined)
    else {
      getEthTransferTransactionBase(
        transferableToken.evmNetworkId,
        from,
        to,
        token,
        tokensToPlanck(amount, token.decimals)
      )
        .then(setTx)
        .catch((err) => {
          setTx(undefined)
          // eslint-disable-next-line no-console
          console.error(err)
        })
    }
  }, [from, to, token, transferableToken?.evmNetworkId, amount])

  const { transaction, priority, setPriority, txDetails, isLoading, gasSettings } =
    useEthTransaction(tx)

  const sendFundsContainer = document.getElementById("send-funds-container")

  useEffect(() => {
    if (!onChange) return
    if (gasSettings) {
      onChange({
        priority,
        gasSettings,
      })
    } else {
      onChange({})
    }
  }, [gasSettings, onChange, priority])

  const estimatedFee = useMemo(
    () =>
      txDetails
        ? new BalanceFormatter(
            ethers.utils.formatUnits(txDetails.estimatedFee, 0),
            nativeToken?.decimals,
            nativeToken?.rates
          )
        : null,
    [nativeToken, txDetails]
  )

  if (!txDetails) return null

  if (!nativeToken || isLoading) return <Loader data-spin />

  if (!estimatedFee || !transaction) return null

  return (
    <Box textalign="right" flex column justify="flex-end" gap={0.1}>
      {txDetails?.priorityOptions && (
        <Box>
          Priority :{" "}
          <EthFeeSelect
            drawerContainer={sendFundsContainer}
            onChange={setPriority}
            priority={priority}
            decimals={nativeToken?.decimals}
            symbol={nativeToken?.symbol}
            transaction={transaction}
            txDetails={txDetails}
          />
        </Box>
      )}
      <Box>
        Est. Fee:{" "}
        <Tokens
          amount={estimatedFee.tokens}
          symbol={nativeToken?.symbol}
          decimals={nativeToken?.decimals}
          noCountUp
        />
        {token?.rates && (
          <>
            {" "}
            / <Fiat amount={estimatedFee.fiat("usd")} currency="usd" noCountUp />
          </>
        )}
      </Box>
    </Box>
  )
}
