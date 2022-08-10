import { BalanceFormatter } from "@core/domains/balances"
import { getEthTransferTransactionBase } from "@core/domains/ethereum/helpers"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { tokensToPlanck } from "@core/util"
import { Box } from "@talisman/components/Box"
import { LoaderIcon } from "@talisman/theme/icons"
import { EthFeeSelect } from "@ui/domains/Sign/EthFeeSelect"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import useToken from "@ui/hooks/useToken"
import { ethers } from "ethers"
import { useEffect, useState } from "react"
import styled from "styled-components"

import Fiat from "../Fiat"
import Tokens from "../Tokens"
import { useEvmTransactionFees } from "./useEvmTransactionFees"
import { useTransferableTokenById } from "./useTransferableTokens"

export const Loader = styled(LoaderIcon)`
  font-size: 1.8rem;
`

export type FeeSettings = {
  priority?: EthPriorityOptionName
  maxPriorityFeePerGas?: string
  maxFeePerGas?: string
}

type EthTransactionFeesProps = {
  transferableTokenId?: string
  amount: string
  from: string
  to: string
  onChange?: (fees: FeeSettings) => void
}

/**
 * This component should only be rendered if the selected chain is EVM and if form is valid
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

  const { priority, setPriority, gasInfo, isLoading } = useEvmTransactionFees(tx)

  const sendFundsContainer = document.getElementById("send-funds-container")

  useEffect(() => {
    if (!onChange) return
    if (priority && gasInfo?.maxPriorityFeePerGas && gasInfo?.maxFeePerGas) {
      onChange({
        priority,
        maxPriorityFeePerGas: ethers.utils.formatUnits(gasInfo.maxPriorityFeePerGas, 0),
        maxFeePerGas: ethers.utils.formatUnits(gasInfo.maxFeePerGas, 0),
      })
    } else {
      onChange({})
    }
  }, [gasInfo, onChange, priority])

  // TODO what if we can't find the native token ?
  if (!nativeToken || isLoading) return <Loader data-spin />

  if (!gasInfo) return null

  const fees = new BalanceFormatter(
    ethers.utils.formatUnits(gasInfo.maxFeeAndGasCost, 0),
    nativeToken?.decimals,
    nativeToken?.rates
  )

  return (
    <Box textalign="right" flex column justify="flex-end" gap={0.1}>
      <Box>
        Priority :{" "}
        <EthFeeSelect
          drawerContainer={sendFundsContainer}
          onChange={setPriority}
          priority={priority}
          decimals={nativeToken?.decimals}
          symbol={nativeToken?.symbol}
          {...gasInfo}
        />
      </Box>
      <Box>
        Max Fee:{" "}
        <Tokens
          amount={fees.tokens}
          symbol={nativeToken?.symbol}
          decimals={nativeToken?.decimals}
        />
        {token?.rates && (
          <>
            {" "}
            / <Fiat amount={fees.fiat("usd")} currency="usd" />
          </>
        )}
      </Box>
    </Box>
  )
}
