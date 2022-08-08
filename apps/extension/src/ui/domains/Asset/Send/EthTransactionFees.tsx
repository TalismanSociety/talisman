import { BalanceFormatter } from "@core/domains/balances"
import { erc20Abi } from "@core/domains/balances/rpc/abis"
import { EthPriorityOptionName } from "@core/domains/signing/types"
import { Token } from "@core/domains/tokens/types"
import { Box } from "@talisman/components/Box"
import { EthFeeSelect } from "@ui/domains/Sign/EthFeeSelect"
import useToken from "@ui/hooks/useToken"
import { ethers } from "ethers"
import { useEffect, useState } from "react"

import Fiat from "../Fiat"
import Tokens from "../Tokens"
import { useEvmTransactionFees } from "./useEvmTransactionFees"
import { useTransferableTokenById } from "./useTransferableTokens"

// TODO utils
const getTransactionRequest = async (
  token: Token,
  amount: string,
  toAddress: string
): Promise<Partial<ethers.providers.TransactionRequest>> => {
  if (token.type === "native") {
    return {
      value: ethers.utils.parseEther(amount), // amount is planck
      to: ethers.utils.getAddress(toAddress),
    }
  } else if (token.type === "erc20") {
    const contract = new ethers.Contract(token.contractAddress, erc20Abi)
    return await contract.populateTransaction["transfer"](
      toAddress,
      ethers.utils.parseEther(amount)
    )
  } else throw new Error(`Invalid token type ${token.type} - token ${token.id}`)
}

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
  amount,
  from,
  to,
  onChange,
}: EthTransactionFeesProps) => {
  const transferableToken = useTransferableTokenById(transferableTokenId)
  const token = useToken(transferableToken?.token?.id)

  const [tx, setTx] = useState<ethers.providers.TransactionRequest>()

  useEffect(() => {
    if (!transferableToken?.evmNetworkId || !token || !amount || !to) setTx(undefined)
    else
      getTransactionRequest(token, amount, to)
        .then((baseTx) =>
          setTx({
            chainId: transferableToken.evmNetworkId,
            from,
            ...baseTx,
          })
        )
        // eslint-disable-next-line no-console
        .catch(console.error)
  }, [amount, from, to, token, transferableToken?.evmNetworkId])

  const { priority, setPriority, gasInfo } = useEvmTransactionFees(tx)

  const sendFundsContainer = document.getElementById("send-funds-container")

  useEffect(() => {
    if (!onChange) return
    if (priority && gasInfo?.maxPriorityFeePerGas && gasInfo?.maxFeePerGas) {
      onChange({
        priority,
        maxPriorityFeePerGas: gasInfo.maxPriorityFeePerGas.toHexString(),
        maxFeePerGas: gasInfo.maxFeePerGas.toHexString(),
      })
    } else {
      onChange({})
    }
  }, [gasInfo, onChange, priority])

  if (!gasInfo) return null

  const fees = new BalanceFormatter(
    ethers.utils.formatUnits(gasInfo.maxFeeAndGasCost, "wei"),
    token?.decimals,
    token?.rates
  )

  return (
    <Box textalign="right" flex column justify="flex-end" gap={0.1}>
      <Box>
        Priority :{" "}
        <EthFeeSelect
          drawerContainer={sendFundsContainer}
          symbol={token?.symbol}
          onChange={setPriority}
          priority={priority}
          {...gasInfo}
        />
      </Box>
      <Box>
        Max Fee: <Tokens amount={fees.tokens} symbol={token?.symbol} decimals={token?.decimals} />
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
