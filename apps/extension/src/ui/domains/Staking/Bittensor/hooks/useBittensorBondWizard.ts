import { tokenSymbolForAnalytics } from "@common/analytics/funds"
import type { StakingEntry } from "@common/analytics/staking"
import { isAccountOfType } from "@core/domains/keyring/exports"
import type { Address } from "@core/types/base"
import {
  type Balance,
  BalanceFormatter,
  type Balances,
  type DTaoClaimTarget,
  getBalanceId,
} from "@talismn/balances"
import {
  type DotNetworkId,
  subDTaoTokenId,
  subNativeTokenId,
  type TokenId,
} from "@talismn/chaindata-provider"
import { track } from "@ui/api/track"
import { useDTaoRootStakeHoldGate } from "@ui/domains/Staking/Bittensor/hooks/dTao/useDTaoRootStakeHold"
import { useGetBittensorColdkeyLock } from "@ui/domains/Staking/Bittensor/hooks/useGetBittensorColdkeyLock"
import { useGetBittensorTransferableBalance } from "@ui/domains/Staking/Bittensor/hooks/useGetBittensorTransferableBalance"
import type { InlineError } from "@ui/hooks/analytics/errorShown"
import { type FlowStep, flows, useFlow } from "@ui/hooks/analytics/flows"
import { useScaleApi } from "@ui/hooks/sapi/useScaleApi"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccountByAddress } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useFeatureFlag, useRemoteConfig } from "@ui/state/remoteConfig"
import { useTokenRates } from "@ui/state/tokenRates"
import { provideContext } from "@ui/util/provideContext"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"
import { useExistentialDeposit } from "../../../../hooks/useExistentialDeposit"
import { useFeeToken } from "../../../SendFunds/useFeeToken"
import { stakingSubmittedReport, stakingTransactionId } from "../../shared/stakingAnalytics"
import { ROOT_NETUID } from "../utils/constants"
import { effectiveLockedAmount, getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"
import { getBittensorFullExitUnstake } from "../utils/fullExitUnstake"
import { getDefaultValidatorHotkey } from "../utils/getDefaultValidatorHotkey"
import { getSweepableRemainder, getSweepableRemainderError } from "../utils/nominationRemainder"
import { getBittensorUnbondClaimOption } from "../utils/unbondClaimOption"
import { useBittensorBondModal } from "./useBittensorBondModal"
import { useBittensorRootClaimGate } from "./useBittensorRootClaimGate"
import {
  type BittensorStakingPosition,
  useBittensorStakingPositions,
} from "./useBittensorStakingPositions"
import { useBittensorSubnetSlippage } from "./useBittensorSubnetSlippage"
import { useGetBittensorStakeInfo } from "./useGetBittensorStakeInfo"

export type WizardStep =
  | "form"
  | "review"
  | "follow-up"
  | "select-delegate"
  | "select-subnet"
  | "select-position"
export type StakeType = "root" | "subnet"
export type StakeDirection = "bond" | "unbond"

type WizardState = {
  step: WizardStep
  networkId: DotNetworkId
  address: Address | null
  hotkey: string | null
  netuid: number | null
  amountIn: bigint | null
  displayMode: "token" | "fiat"
  hash: Hex | null
  stakeType: StakeType | null
  stakeDirection: StakeDirection
  /** when unstaking from root, batch a claim of the pending rewards (opt-out) */
  withClaim: boolean
}

export type BittensorStakingWizardOpenOptions = {
  entry: StakingEntry
  stakeDirection: StakeDirection
  networkId: DotNetworkId
  netuid?: number
  address?: Address
  hotkey?: string
}

const FLOW_STEPS = {
  "select-subnet": "subnet",
  "select-position": "position",
  "select-delegate": "validator",
  "form": "form",
  "review": "review",
  "follow-up": null,
} as const satisfies Record<WizardStep, FlowStep<typeof flows.staking> | null>

const DEFAULT_STATE: WizardState = {
  step: "form",
  address: null,
  networkId: "bittensor",
  hotkey: null,
  netuid: null,
  amountIn: null,
  displayMode: "token",
  hash: null,
  stakeType: null,
  stakeDirection: "bond",
  withClaim: true,
}

const getInitialWizardState = (init: BittensorStakingWizardOpenOptions): WizardState => {
  const stakeType = typeof init.netuid === "number" ? (init.netuid === 0 ? "root" : "subnet") : null
  const step =
    init.stakeDirection === "bond"
      ? typeof init.netuid === "number"
        ? "form"
        : "select-subnet"
      : init.hotkey
        ? "form"
        : "select-position"
  return Object.assign({}, DEFAULT_STATE, init, { stakeType, step })
}

const useBalance = (
  allBalances: Balances,
  address: Address | null | undefined,
  tokenId: TokenId | null | undefined
): Balance | null => {
  return useMemo(() => {
    if (!address || !tokenId) return null
    return allBalances.get(getBalanceId({ tokenId, address })) ?? null
  }, [allBalances, address, tokenId])
}

const useDtaoToken = (networkId: string, netuid: number, hotkey?: string) => {
  // use the dynamic token if user already has a balance
  const tokenWithHotkey = useToken(
    useMemo(() => subDTaoTokenId(networkId, netuid, hotkey), [networkId, netuid, hotkey]),
    "substrate-dtao"
  )
  // otherwise the template token (without hotkey)
  const tokenWithoutHotkey = useToken(
    useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid]),
    "substrate-dtao"
  )

  return tokenWithHotkey || tokenWithoutHotkey
}

const useBittensorBondWizardProvider = () => {
  const { t } = useTranslation()
  const allBalances = useBalances("owned")
  const remoteConfig = useRemoteConfig()
  const { args, isOpen } = useBittensorBondModal()

  const [
    {
      networkId,
      address,
      netuid,
      hotkey,
      step,
      stakeType,
      displayMode,
      hash,
      amountIn,
      stakeDirection,
      withClaim,
    },
    setWizardState,
  ] = useState(() => {
    const defValue = args ? getInitialWizardState(args) : DEFAULT_STATE

    // Synchronously adjust the default set to have the best hotkey for the user
    if (
      defValue.stakeDirection === "bond" &&
      typeof defValue.netuid === "number" &&
      !defValue.hotkey
    )
      return {
        ...defValue,
        hotkey:
          getDefaultValidatorHotkey(
            defValue.networkId,
            defValue.netuid,
            remoteConfig,
            allBalances,
            defValue.address
          ) ?? null,
      }

    return defValue
  })
  const nativeTokenId = useMemo(() => (networkId ? subNativeTokenId(networkId) : null), [networkId])
  const dtaoToken = useDtaoToken(networkId ?? "", netuid ?? 0, hotkey ?? undefined)

  const [isMevProtectionEnabled, setIsMevProtectionEnabled] = useState(false)

  const dtaoBalance = useBalance(allBalances, address, dtaoToken?.id)
  const nativeBalance = useBalance(allBalances, address, nativeTokenId)
  const account = useAccountByAddress(address)
  const nativeToken = useToken(nativeTokenId, "substrate-native")
  const feeToken = useFeeToken(nativeToken?.id)
  const tokenRates = useTokenRates(nativeTokenId)
  const existentialDeposit = useExistentialDeposit(nativeToken?.id)
  const accountPicker = useOpenClose()
  const slippageDrawer = useOpenClose()
  const warningDrawer = useOpenClose()
  const seekDiscountDrawer = useOpenClose()

  const { data: sapi } = useScaleApi(nativeToken?.networkId)

  // when unstaking from root, the pending rewards of the (coldkey, hotkey) pair can be
  // claimed within the same transaction
  const claimTarget = useMemo<DTaoClaimTarget | null>(
    () =>
      stakeDirection === "unbond" && netuid === ROOT_NETUID && address && hotkey
        ? { networkId, address, hotkey }
        : null,
    [stakeDirection, netuid, address, hotkey, networkId]
  )
  const claimGate = useBittensorRootClaimGate(sapi, claimTarget)
  const claimOption = useMemo(
    () =>
      getBittensorUnbondClaimOption({
        isRootUnbond: !!claimTarget,
        withClaim,
        claimablePlancks: claimGate.claimablePlancks,
        isClaimUnavailable: claimGate.isClaimUnavailable,
        canSubmit: claimGate.canSubmit,
      }),
    [
      claimTarget,
      withClaim,
      claimGate.claimablePlancks,
      claimGate.isClaimUnavailable,
      claimGate.canSubmit,
    ]
  )

  const totalStakedPlancks = useMemo(
    () => dtaoBalance?.free.planck ?? 0n,
    [dtaoBalance?.free.planck]
  )

  // Bittensor conviction lock: constrains the coldkey's TOTAL alpha on the subnet,
  // the locked amount cannot be unstaked (chain would throw StakeUnavailable)
  const subnetUnstakeInfo = useMemo(
    () =>
      address && networkId && typeof netuid === "number"
        ? getDTaoSubnetUnstakeInfo(allBalances, address, networkId, netuid)
        : null,
    [allBalances, address, networkId, netuid]
  )

  const convictionLock = subnetUnstakeInfo?.convictionLock ?? null

  // The cached lock (from balances, polled every ~6s) can lag a lock that GROWS on-chain
  // (owner auto-lock every block, or a concurrent top-up). Read it fresh while unbonding so the
  // available-to-unstake guard tightens before signing, avoiding a StakeUnavailable revert.
  const { data: freshLockedMass } = useGetBittensorColdkeyLock({
    networkId,
    address,
    netuid: stakeDirection === "unbond" ? netuid : null,
  })

  // guard with the larger of cached vs fresh lock (a lock can only ever constrain unstaking more)
  const effectiveLocked = useMemo(
    () => effectiveLockedAmount(convictionLock?.amount ?? 0n, freshLockedMass),
    [convictionLock?.amount, freshLockedMass]
  )

  // for this position: min(position stake, subnet-wide available to unstake)
  const availableToUnstakePlancks = useMemo(() => {
    const stakedTotal = subnetUnstakeInfo?.stakedTotal ?? totalStakedPlancks
    const subnetAvailable = stakedTotal > effectiveLocked ? stakedTotal - effectiveLocked : 0n
    return totalStakedPlancks < subnetAvailable ? totalStakedPlancks : subnetAvailable
  }, [subnetUnstakeInfo?.stakedTotal, effectiveLocked, totalStakedPlancks])

  // whole unlocked position leaving root with the claim batched, hold window proven off:
  // the payload can use the claim-first full-exit order
  const fullExit = useMemo(
    () =>
      getBittensorFullExitUnstake({
        isRootUnbond: !!claimTarget,
        amountIn,
        totalStakedPlancks,
        availableToUnstakePlancks,
        includeClaim: claimOption.includeClaim,
        holdIntervalBlocks: claimGate.holdIntervalBlocks,
        isHoldIntervalReady: claimGate.isHoldIntervalReady,
      }),
    [
      claimTarget,
      amountIn,
      totalStakedPlancks,
      availableToUnstakePlancks,
      claimOption.includeClaim,
      claimGate.holdIntervalBlocks,
      claimGate.isHoldIntervalReady,
    ]
  )

  const isMevShieldFeatureEnabled = useFeatureFlag("BITTENSOR_MEV_SHIELD")

  const isMevShieldDisabled = useMemo(() => {
    // disabled when feature flag is off
    // no need for root staking
    // supported only for hot wallets
    return !isMevShieldFeatureEnabled || !netuid || !isAccountOfType(account, "keypair")
  }, [isMevShieldFeatureEnabled, netuid, account])

  const withMevShield = useMemo(
    () => !isMevShieldDisabled && isMevProtectionEnabled,
    [isMevShieldDisabled, isMevProtectionEnabled]
  )

  const {
    alphaPrice,
    swapPrice,
    payload,
    txMetadata,
    isLoadingPayload,
    errorPayload,
    feeEstimate,
    errorFeeEstimate,
    isLoadingFeeEstimate,
    currentHotkey,
    minTaoBond,
    minTaoBondForInput,
    minAlphaBond,
    minTaoStakeForInput,
    minAlphaUnstake,
    priceImpact,
    talismanFee,
    slippage,
    amountOut,
  } = useGetBittensorStakeInfo({
    sapi,
    address,
    hotkey,
    netuid,
    amountIn,
    networkId: nativeToken?.networkId,
    stakeDirection,
    withClaim: claimOption.includeClaim,
    fullExit,
  })

  const isSubnetUnbond = useMemo(
    () => stakeDirection === "unbond" && netuid !== ROOT_NETUID,
    [netuid, stakeDirection]
  )

  const amountTao = useMemo(
    () =>
      typeof amountIn === "bigint"
        ? new BalanceFormatter(
            isSubnetUnbond ? amountOut : amountIn,
            nativeToken?.decimals,
            tokenRates
          )
        : null,
    [amountIn, isSubnetUnbond, amountOut, nativeToken?.decimals, tokenRates]
  )

  const amountAlpha = useMemo(
    () =>
      typeof amountIn === "bigint"
        ? new BalanceFormatter(
            isSubnetUnbond ? amountIn : amountOut,
            nativeToken?.decimals,
            tokenRates
          )
        : null,
    [amountIn, amountOut, isSubnetUnbond, nativeToken?.decimals, tokenRates]
  )

  const setAddress = useCallback(
    (address: Address) => setWizardState((prev) => ({ ...prev, address })),
    []
  )

  const isHotkeyAutoSelected = useRef(!args?.hotkey)

  const setHotkey = useCallback((hotkey: string) => {
    isHotkeyAutoSelected.current = false
    setWizardState((prev) => ({ ...prev, hotkey }))
  }, [])

  const setNetuid = useCallback(
    (netuid: number) => {
      isHotkeyAutoSelected.current = true

      setWizardState((prev) => {
        if (prev.netuid === netuid) return prev
        return {
          ...prev,
          netuid,
          amountIn: null,
          withClaim: true,
          stakeType: netuid ? "subnet" : "root",
          hotkey:
            prev.stakeDirection === "bond"
              ? (getDefaultValidatorHotkey(
                  prev.networkId,
                  netuid,
                  remoteConfig,
                  allBalances,
                  prev.address
                ) ?? null)
              : null,
        }
      })
    },
    [allBalances, remoteConfig]
  )

  const setPlancks = useCallback(
    (plancks: bigint | null) => setWizardState((prev) => ({ ...prev, amountIn: plancks })),
    []
  )

  const setWithClaim = useCallback(
    (withClaim: boolean) => setWizardState((prev) => ({ ...prev, withClaim })),
    []
  )

  const toggleDisplayMode = useCallback(() => {
    setWizardState((prev) => ({
      ...prev,
      displayMode: prev.displayMode === "token" ? "fiat" : "token",
    }))
  }, [])

  const isStakeFormValid = useMemo(
    () =>
      !!account &&
      !!nativeToken &&
      !!hotkey &&
      (stakeType === "root" ? true : !!netuid) &&
      !!amountTao &&
      typeof minTaoBondForInput === "bigint" &&
      amountIn &&
      amountIn > 0n,
    [account, amountTao, minTaoBondForInput, netuid, amountIn, hotkey, stakeType, nativeToken]
  )

  const isUnstakeFormValid = useMemo(() => amountIn && amountIn > 0n, [amountIn])

  const isFormValid = useMemo(
    () => (stakeDirection === "bond" ? isStakeFormValid : isUnstakeFormValid),
    [isStakeFormValid, isUnstakeFormValid, stakeDirection]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: legacy
  useEffect(() => {
    if (
      currentHotkey &&
      isHotkeyAutoSelected.current &&
      currentHotkey !== hotkey &&
      stakeDirection === "bond"
    ) {
      setWizardState((prev) => ({ ...prev, hotkey: currentHotkey }))
    }
  }, [currentHotkey, hotkey, stakeDirection, step])

  const setStep = useCallback(
    (step: WizardStep) => {
      setWizardState((prev) => {
        if (prev.step === "form" && step === "review" && !isFormValid) return prev

        return { ...prev, step }
      })
    },
    [isFormValid]
  )

  const setPosition = useCallback((position: BittensorStakingPosition) => {
    if (!position.token.hotkey) return
    setWizardState((prev) => {
      return {
        ...prev,
        step: "form",
        networkId: position.token.networkId,
        hotkey: position.token.hotkey!,
        netuid: position.token.netuid,
        address: position.balance.address,
        stakeType: position.token.netuid === 0 ? "root" : "subnet",
        withClaim: true,
      }
    })
  }, [])

  const toggleMevProtection = useCallback(
    (enabled: boolean) => {
      track("staking_mev_shield_toggled", {
        enabled,
        direction: stakeDirection === "bond" ? "stake" : "unstake",
      })
      setIsMevProtectionEnabled(enabled)
    },
    [stakeDirection]
  )

  const network = useNetworkById(networkId)
  const [slippageTolerance, , isDefaultSlippage] = useBittensorSubnetSlippage(netuid)

  const onSubmitted = useCallback(
    (hash: Hex, innerHash?: Hex) => {
      if (!hash) return
      const report = stakingSubmittedReport({
        account,
        network,
        symbol: tokenSymbolForAnalytics(isSubnetUnbond ? dtaoToken : nativeToken),
        usd: amountTao?.fiat("usd"),
        slippage:
          stakeType === "subnet"
            ? { percent: slippageTolerance, isDefault: isDefaultSlippage }
            : null,
      })
      if (report)
        flows.staking.submitted({
          ...report,
          mev_shield: withMevShield,
          transactionId: stakingTransactionId(hash, innerHash),
        })
      setWizardState((prev) => ({ ...prev, step: "follow-up", hash }))
    },
    [
      account,
      network,
      isSubnetUnbond,
      amountTao,
      stakeType,
      slippageTolerance,
      isDefaultSlippage,
      withMevShield,
      nativeToken,
      dtaoToken,
    ]
  )

  useFlow(flows.staking, {
    active: isOpen && !!args,
    entry: args?.entry ?? "portfolio",
    started: { mode: args?.stakeDirection === "unbond" ? "unstake" : "stake" },
    attributes: {
      staking_type: "bittensor",
      direction: stakeDirection === "bond" ? "stake" : "unstake",
      ...(typeof netuid === "number" && { netuid }),
    },
    step: FLOW_STEPS[step],
  })

  // (spec 441) root stake inside its RootStakeUnlockInterval hold window cannot leave root:
  // remove_stake would revert with RootStakeLocked
  const rootStakeHoldGate = useDTaoRootStakeHoldGate(
    stakeDirection === "unbond" ? dtaoBalance : null
  )

  const maxPlancks = useMemo(() => {
    if (stakeDirection === "unbond") {
      return availableToUnstakePlancks
    }
    if (!nativeBalance || !existentialDeposit || !feeEstimate) return null
    // Add a 5% safety margin on the fee estimate to absorb variance between
    // the estimated fee and the actual fee charged at execution time.
    const feeWithMargin = feeEstimate + feeEstimate / 20n
    if (existentialDeposit.planck + feeWithMargin > nativeBalance.transferable.planck) return null
    return nativeBalance.transferable.planck - existentialDeposit.planck - feeWithMargin
  }, [stakeDirection, nativeBalance, existentialDeposit, feeEstimate, availableToUnstakePlancks])

  const newStakeTotal = useMemo(() => {
    if (stakeDirection === "unbond") {
      return totalStakedPlancks - (amountIn || 0n)
    }
    if (stakeType === "subnet") {
      return totalStakedPlancks + amountOut
    }
    return totalStakedPlancks + (amountIn || 0n)
  }, [amountOut, amountIn, stakeDirection, stakeType, totalStakedPlancks])

  const stakeInputError = useMemo<InlineError | null>(() => {
    if (!amountTao || typeof minTaoBondForInput !== "bigint") return null

    if (amountTao.planck && amountTao.planck > (nativeBalance?.transferable?.planck ?? 0n))
      return { message: t("Insufficient balance"), category: "insufficient_balance" }

    if (
      nativeBalance &&
      feeEstimate &&
      amountTao.planck &&
      amountTao.planck + feeEstimate > nativeBalance.transferable.planck
    )
      return { message: t("Insufficient balance to cover fee"), category: "insufficient_fee" }

    if (
      nativeBalance &&
      feeEstimate &&
      existentialDeposit?.planck &&
      amountTao.planck &&
      existentialDeposit.planck + amountTao.planck + feeEstimate > nativeBalance.transferable.planck
    )
      return {
        message: t("Insufficient balance to cover fee and keep account alive"),
        category: "insufficient_fee",
      }

    // if not staking yet, need minTaoBondForInput or more
    if (!dtaoBalance?.free.planck && amountTao.planck < minTaoBondForInput)
      return {
        message: t("Minimum bond is {{amount}} {{symbol}}", {
          amount: new BalanceFormatter(minTaoBondForInput, nativeToken?.decimals).tokens,
          symbol: nativeToken?.symbol,
        }),
        category: "input_invalid",
      }

    // no staking operation can be less than minTaoStakeForInput
    if (typeof minTaoStakeForInput === "bigint" && amountTao.planck < minTaoStakeForInput)
      return {
        message: t("Minimum bond is {{amount}} {{symbol}}", {
          amount: new BalanceFormatter(minTaoStakeForInput, nativeToken?.decimals).tokens,
          symbol: nativeToken?.symbol,
        }),
        category: "input_invalid",
      }

    return null
  }, [
    amountTao,
    minTaoBondForInput,
    nativeBalance,
    t,
    feeEstimate,
    existentialDeposit?.planck,
    dtaoBalance?.free.planck,
    nativeToken?.decimals,
    nativeToken?.symbol,
    minTaoStakeForInput,
  ])

  // Accounts with zero free TAO have no native balance record at all (the balance pool
  // drops zero balances), so a missing record can't distinguish "zero TAO" from "not
  // loaded yet": read the balance fresh from chain, falling back to the pool record
  // while the query loads
  const { data: freshTransferableTao, isError: isErrorTransferableTao } =
    useGetBittensorTransferableBalance({
      networkId,
      address: stakeDirection === "unbond" ? address : null,
    })
  const knownTransferableTao = freshTransferableTao ?? nativeBalance?.transferable.planck ?? null

  const sweepableRemainderError = useMemo(() => {
    if (
      stakeDirection !== "unbond" ||
      typeof minAlphaBond !== "bigint" ||
      typeof minTaoBond !== "bigint" ||
      !nativeToken ||
      !dtaoToken
    )
      return null
    const remainder = getSweepableRemainder({
      stake: totalStakedPlancks,
      amount: amountIn ?? 0n,
      maxAmount: availableToUnstakePlancks,
      minKeep: minAlphaBond,
      minAmount: minAlphaUnstake ?? 0n,
    })
    return (
      remainder &&
      getSweepableRemainderError(t, remainder, {
        minTao: minTaoBond,
        tao: nativeToken,
        alpha: dtaoToken,
      })
    )
  }, [
    stakeDirection,
    minAlphaBond,
    minTaoBond,
    nativeToken,
    dtaoToken,
    totalStakedPlancks,
    amountIn,
    availableToUnstakePlancks,
    minAlphaUnstake,
    t,
  ])

  const unstakeInputError = useMemo<InlineError | null>(() => {
    if (rootStakeHoldGate.message)
      return { message: rootStakeHoldGate.message, category: "input_invalid" }

    if (knownTransferableTao === null && isErrorTransferableTao)
      return { message: t("Failed to load TAO balance"), category: "rpc" }

    // the chain only pays fees from staked alpha for direct calls, never inside the batch_all
    // the wallet sends, so the fee always comes from free TAO
    if (
      amountIn &&
      existentialDeposit?.planck &&
      feeEstimate &&
      typeof knownTransferableTao === "bigint" &&
      existentialDeposit.planck + feeEstimate > knownTransferableTao
    ) {
      return {
        message: t(
          "Insufficient free TAO to pay network fees. Fees are paid from your wallet balance, not your stake."
        ),
        category: "insufficient_fee",
      }
    }

    if ((amountIn || 0n) > totalStakedPlancks) {
      return { message: t("Insufficient balance"), category: "insufficient_balance" }
    }
    if ((amountIn || 0n) > availableToUnstakePlancks) {
      // the conviction locked stake cannot be unstaked (chain would throw StakeUnavailable)
      if (effectiveLocked > 0n)
        return {
          message: t("Exceeds unlocked stake: {{amount}} {{symbol}} is locked", {
            amount: new BalanceFormatter(effectiveLocked, dtaoToken?.decimals).tokens,
            symbol: dtaoToken?.symbol,
          }),
          category: "input_invalid",
        }
      return { message: t("Insufficient balance"), category: "insufficient_balance" }
    }
    if (sweepableRemainderError) return sweepableRemainderError

    // no staking operation can be less than minTaoStake
    if (amountAlpha?.planck && minAlphaUnstake && amountAlpha.planck < minAlphaUnstake)
      return {
        message: t("Minimum unbond is {{amount}} {{symbol}}", {
          amount: new BalanceFormatter(minAlphaUnstake, dtaoToken?.decimals).tokens,
          symbol: dtaoToken?.symbol,
        }),
        category: "input_invalid",
      }

    return null
  }, [
    rootStakeHoldGate.message,
    amountIn,
    existentialDeposit?.planck,
    feeEstimate,
    knownTransferableTao,
    isErrorTransferableTao,
    totalStakedPlancks,
    availableToUnstakePlancks,
    effectiveLocked,
    sweepableRemainderError,
    amountAlpha?.planck,
    minAlphaUnstake,
    t,
    dtaoToken?.decimals,
    dtaoToken?.symbol,
  ])

  const inputError = stakeDirection === "bond" ? stakeInputError : unstakeInputError
  const inputErrorMessage = inputError?.message ?? null

  // positions are used only when unstaking
  const positions = useBittensorStakingPositions(networkId)
  const position = useMemo(() => {
    return positions.find(
      (p) =>
        p.token.netuid === netuid &&
        p.token.hotkey === hotkey &&
        p.token.networkId === networkId &&
        p.balance.address === address
    )
  }, [positions, netuid, hotkey, networkId, address])

  useEffect(() => {
    // if unstaking and no position selected, open position select step
    if (stakeDirection === "unbond" && step === "form" && !position) setStep("select-position")
  }, [stakeDirection, position, setStep, step])

  return {
    account,
    nativeToken,
    dtaoToken,
    tokenRates,
    networkId,
    hotkey,
    netuid,
    amountIn,
    amountTao,
    amountAlpha,
    displayMode,
    accountPicker,
    slippageDrawer,
    warningDrawer,
    seekDiscountDrawer,
    isFormValid,
    step,
    hash,
    feeToken,
    maxPlancks,
    inputErrorMessage,
    inputErrorCategory: inputError?.category,
    inputErrorFillAmount:
      sweepableRemainderError && inputError === sweepableRemainderError
        ? sweepableRemainderError.fillAmount
        : null,
    stakeDirection,
    dtaoBalance,
    availableToUnstakePlancks,
    convictionLock,
    newStakeTotal,
    isSubnetUnbond,
    position,
    slippage,
    claimOption,
    claimablePlancks: claimGate.claimablePlancks,
    claimForfeitedPlancks: claimGate.forfeitedPlancks,
    dustThreshold: claimGate.dustThreshold,
    isBelowDustThreshold: claimGate.isBelowDustThreshold,
    claimHoldDurationMs: claimGate.holdDurationMs,
    payload:
      !inputErrorMessage &&
      isFormValid &&
      !rootStakeHoldGate.isBlocked &&
      (stakeDirection === "bond" || typeof knownTransferableTao === "bigint")
        ? payload
        : null,
    txMetadata,
    isLoadingPayload: isLoadingPayload,
    errorPayload,
    feeEstimate,
    isLoadingFeeEstimate,
    errorFeeEstimate,
    stakeType,
    alphaPrice,
    swapPrice,
    talismanFee,
    amountOut,
    priceImpact,
    withMevShield,
    isMevShieldDisabled,
    isMevShieldFeatureDisabled: !isMevShieldFeatureEnabled,
    setIsMevProtectionEnabled: toggleMevProtection,
    setAddress,
    setNetuid,
    setHotkey,
    setPlancks,
    setWithClaim,
    setStep,
    setPosition,
    toggleDisplayMode,
    onSubmitted,
  }
}

export const [BittensorBondWizardProvider, useBittensorBondWizard] = provideContext(
  useBittensorBondWizardProvider
)
