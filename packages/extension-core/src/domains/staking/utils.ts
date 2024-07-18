import keyring from "@polkadot/ui-keyring"
import { Address, Balances } from "@talismn/balances"
import { ChainId, Token, TokenId } from "@talismn/chaindata-provider"
import { log } from "extension-shared"
import { combineLatest, debounceTime } from "rxjs"

import { awaitKeyringLoaded } from "../../util/awaitKeyringLoaded"
import { balancePool } from "../balances/pool"
import { EVM_LSD_PAIRS, NOM_POOL_MIN_DEPOSIT, NOM_POOL_SUPPORTED_CHAINS } from "./constants"
import { stakingBannerStore } from "./store.StakingBanners"

type ShouldShowBanner = boolean
export type NomPoolStakingBannerStatus = Record<ChainId, Record<Address, ShouldShowBanner>>
export type EvmLSdStakingBannerStatus = Record<TokenId, Record<Address, ShouldShowBanner>>

export type StakingBannerStatus = {
  nomPool: NomPoolStakingBannerStatus
  evmLsd: EvmLSdStakingBannerStatus
}

const MAX_UPDATE_INTERVAL = 2_000 // update every 2 seconds maximum

type AddressStatuses = Record<Address, ShouldShowBanner>
export type ChainAddressStatuses = Record<ChainId, AddressStatuses>

const safelyGetExistentialDeposit = (token?: Token | null): bigint => {
  if (token && "existentialDeposit" in token && typeof token.existentialDeposit === "string")
    return BigInt(token.existentialDeposit)
  return 0n
}

const shouldShowSubstrateNomPoolBanners = async ({
  addresses,
  balances,
}: {
  addresses: string[]
  balances: Balances
}) => {
  const totals = NOM_POOL_SUPPORTED_CHAINS.reduce((acc, chainId) => {
    const balancesForChain = balances.find({
      chainId,
      source: "substrate-native",
    })

    // for each address, get the free balance after accounting for ED and minimum staking deposit and the staked amount
    const addressBalances = addresses.reduce((acc, address) => {
      const addressBalances = balancesForChain.find({ address })
      if (!addressBalances) return acc
      const balancesForAddress = addressBalances.each.reduce(
        (result, balance) => {
          // if the balance is less than the ED - minimum stake, it is not eligible
          // however because we aggregate balances across accounts here, we don't want to store available values of less than 0
          const realAvailable =
            balance.free.planck -
            safelyGetExistentialDeposit(balance.token) -
            BigInt(NOM_POOL_MIN_DEPOSIT[chainId] || 0)

          const available = realAvailable > 0n ? realAvailable : 0n

          const staked = balance.reserves
            .filter(
              (reserve) =>
                reserve.label === "nompools-staking" || reserve.label === "nompools-unbonding"
            )
            .reduce((balanceSum, { amount }) => {
              return balanceSum + amount.planck
            }, 0n)

          return { staked: staked + result.staked, available: available + result.available }
        },
        { available: 0n, staked: 0n } as { available: bigint; staked: bigint }
      )
      acc[address] = balancesForAddress.available > 0n && balancesForAddress.staked === 0n
      return acc
    }, {} as AddressStatuses)

    return {
      ...acc,
      [chainId]: addressBalances,
    }
  }, {} as NomPoolStakingBannerStatus)

  return totals
}

const shouldShowEvmLsdBanners = async ({
  addresses,
  balances,
}: {
  addresses: string[]
  balances: Balances
}) => {
  return Object.values(EVM_LSD_PAIRS).reduce((acc, pairs) => {
    Object.values(pairs).forEach(({ base, derivative }) => {
      if (!(base in acc)) acc[base] = {}
      const balancePairs = balances.find([{ tokenId: base }, { tokenId: derivative }])

      // for each address, determine whether it has a balance of the base token but not the derivative
      for (const address of addresses) {
        const derivativeBalance = balancePairs.find({ address, tokenId: derivative }).sum.planck
          .free
        const baseBalance = balancePairs.find({ address, tokenId: base }).sum.planck.free
        acc[base][address] = acc[base][address] || (baseBalance > 0n && derivativeBalance === 0n)
      }
    })
    return acc
  }, {} as EvmLSdStakingBannerStatus)
}

export const trackStakingBannerDisplay = async () => {
  await awaitKeyringLoaded()

  combineLatest([keyring.accounts.subject, balancePool.observable])
    .pipe(debounceTime(MAX_UPDATE_INTERVAL))
    .subscribe(async ([accounts, rawBalances]) => {
      try {
        const balances = new Balances(rawBalances)

        const substrateAddresses = Object.values(accounts)
          .filter(({ type }) => type === "sr25519")
          .map(({ json }) => json.address)

        const showNomPoolBanners = await shouldShowSubstrateNomPoolBanners({
          addresses: substrateAddresses,
          balances,
        })

        // only balances on ethereum accounts are eligible for lido staking
        const ethereumAddresses = Object.values(accounts)
          .filter(({ type }) => type === "ethereum")
          .map(({ json }) => json.address)

        const showEvmLsdBanners = await shouldShowEvmLsdBanners({
          addresses: ethereumAddresses,
          balances,
        })

        await stakingBannerStore.replace({ nomPool: showNomPoolBanners, evmLsd: showEvmLsdBanners })
      } catch (err) {
        log.error("trackStakingBannerDisplay", { err })
      }
    })
}
