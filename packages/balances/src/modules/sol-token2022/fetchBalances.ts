import { PublicKey } from "@solana/web3.js"
import { solToken2022TokenId } from "@talismn/chaindata-provider"
import { isNotNil } from "@talismn/util"
import { keyBy, uniq } from "lodash-es"

import log from "../../log"
import type { IBalance } from "../../types"
import type { IBalanceModule } from "../../types/IBalanceModule"
import { getBalanceDefs } from "../shared"
import { setDetectedTokenIds } from "../shared/detectedTokens"
import { MODULE_TYPE } from "./config"

const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"

export const fetchBalances: IBalanceModule<typeof MODULE_TYPE>["fetchBalances"] = async ({
  networkId,
  tokensWithAddresses,
  connector,
}) => {
  if (!tokensWithAddresses.length) return { success: [], errors: [] }

  const connection = await connector.getConnection(networkId)
  if (!connection) throw new Error(`Could not get connection for Solana network ${networkId}`)

  const accountAddresses = uniq(tokensWithAddresses.flatMap(([, addresses]) => addresses))

  const balancesPerAddress = await Promise.all(
    accountAddresses.map(async (address) => {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(new PublicKey(address), {
        programId: new PublicKey(TOKEN_2022_PROGRAM_ID),
      })

      const balances = tokenAccounts.value
        .map((d): IBalance | null => {
          try {
            const mintAddress = d.account.data.parsed.info.mint
            const value = d.account.data.parsed.info.tokenAmount.amount ?? "0"
            return {
              tokenId: solToken2022TokenId(networkId, mintAddress),
              networkId,
              address,
              source: MODULE_TYPE,
              status: "live",
              value,
            }
          } catch {
            log.warn("Failed to parse token amount", {
              address,
              d,
            })
            return null
          }
        })
        .filter(isNotNil)

      setDetectedTokenIds(
        address,
        MODULE_TYPE,
        balances.map((b) => b.tokenId)
      )

      return [address, balances] as const
    })
  )

  const allBalancesByKey = keyBy(
    balancesPerAddress.flatMap(([, addressBalances]) => addressBalances),
    (b) => getBalanceKey(b.tokenId, b.address)
  )

  const balanceDefs = getBalanceDefs<typeof MODULE_TYPE>(tokensWithAddresses)

  const success = balanceDefs.map((bd): IBalance => {
    const found = allBalancesByKey[getBalanceKey(bd.token.id, bd.address)]
    return (
      found ?? {
        tokenId: bd.token.id,
        networkId: bd.token.networkId,
        address: bd.address,
        source: MODULE_TYPE,
        status: "live",
        value: "0",
      }
    )
  })

  return { success, errors: [] }
}

const getBalanceKey = (tokenId: string, address: string) => `${tokenId}:${address}`
