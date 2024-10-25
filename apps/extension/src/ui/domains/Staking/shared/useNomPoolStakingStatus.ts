import { TokenId } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { log } from "extension-shared"
import { useMemo } from "react"

import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useBalances, useToken } from "@ui/state"
import { ScaleApi } from "@ui/util/scaleApi"

import { getStakingEraDurationMs } from "../helpers"
import { NomPoolMember } from "../types"
import { useDetaultNomPoolId } from "./useDetaultNomPoolId"
import { useNomPoolsMinJoinBond } from "./useNomPoolsMinJoinBond"

export const useNomPoolStakingStatus = (tokenId: TokenId) => {
  const token = useToken(tokenId)
  const poolId = useDetaultNomPoolId(token?.chain?.id)
  const ownedBalances = useBalances("owned")

  // dont get sapi if we dont have a poolId, it would fetch metadata for nothing
  const { data: sapi } = useScaleApi(poolId ? token?.chain?.id : null)
  const { data: minJoinBond } = useNomPoolsMinJoinBond(poolId ? token?.chain?.id : null)
  const { selectedAccount: account } = usePortfolioNavigation()

  const [balances, balancesKey] = useMemo(() => {
    if (!minJoinBond || !token) return [[], ""]
    const balances = ownedBalances
      .find({ tokenId: token.id })
      .each.filter((b) => !account || account.address === b.address)
      .filter((b) => !!b.transferable.planck)
    return [balances, balances.map((b) => `${b.address}-${b.transferable.planck}`)]
  }, [account, minJoinBond, ownedBalances, token])

  return useQuery({
    queryKey: ["useNomPoolStakingStatus", sapi?.id, token?.id, poolId, balancesKey],
    queryFn: async () => {
      if (!sapi || !token || !poolId || !minJoinBond || !balances.length) return null

      const addresses = balances
        .sort((a, b) => {
          // sort by descending transferable balance
          if (a.transferable.planck === b.transferable.planck) return 0
          return a.transferable.planck < b.transferable.planck ? 1 : -1
        })
        .map((b) => b.address)

      const [currentEra, soloStakingByAddress, nomPoolStakingByAddress] = await Promise.all([
        sapi.getStorage<number>("Staking", "CurrentEra", []),

        Object.fromEntries(
          await Promise.all(
            addresses.map(async (address) => [
              address,
              !!(await sapi.getStorage("Staking", "Bonded", [address])),
            ]),
          ),
        ) as Record<string, boolean>,

        Object.fromEntries(
          await Promise.all(
            addresses.map(async (address) => [
              address,
              await sapi.getStorage<NomPoolMember | null>("NominationPools", "PoolMembers", [
                address,
              ]),
            ]),
          ),
        ) as Record<string, NomPoolMember | null>,
      ])

      const transferableByAddress = Object.fromEntries(
        balances.map(({ address, transferable }) => [address, transferable.planck]),
      )

      const accounts = await Promise.all(
        balances.map(async ({ address }) => {
          const unbondingEras =
            nomPoolStakingByAddress[address]?.unbonding_eras.map(([era]) => era) ?? []
          const maxUnbondingEra = Math.max(...unbondingEras)
          const erasToUnbonding = currentEra <= maxUnbondingEra ? maxUnbondingEra - currentEra : 0

          return {
            address,
            poolId: nomPoolStakingByAddress[address]?.pool_id,
            isSoloStaking: !!soloStakingByAddress[address],
            isNomPoolsStaking: !!nomPoolStakingByAddress[address],
            canBondNomPool: !soloStakingByAddress[address] && !!transferableByAddress[address],
            canUnstake: nomPoolStakingByAddress[address]?.points,
            canWithdraw: maxUnbondingEra <= currentEra,
            canWithdrawIn: await getWithdrawWaitDuration(sapi, erasToUnbonding),
          }
        }),
      )

      return { accounts, poolId }
    },
    enabled: !!sapi,
  })
}

const getWithdrawWaitDuration = async (sapi: ScaleApi, eras: number) => {
  if (eras <= 0) return 0

  try {
    const eraDuration = await getStakingEraDurationMs(sapi)
    return eras * Number(eraDuration)
  } catch (err) {
    log.error("Failed to get era duration", err)
    return null
  }
}
