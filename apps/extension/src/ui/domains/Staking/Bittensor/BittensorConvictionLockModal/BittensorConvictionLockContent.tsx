import { isAccountCompatibleWithNetwork } from "@core/domains/accounts/helpers"
import { TAO_DECIMALS } from "@talismn/balances"
import { type DotNetworkId, subDTaoTokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { Button } from "@ui/components/Button"
import { PillButton } from "@ui/components/PillButton"
import { ScrollContainer } from "@ui/components/ScrollContainer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountPicker } from "@ui/domains/AccountProxies/AddProxy/AccountPicker"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AddressPillButton } from "@ui/domains/SendFunds/SendFundsAmountForm/AddressPillButton"
import { useCombinedBittensorValidatorsData } from "@ui/domains/Staking/hooks/bittensor/useCombinedBittensorValidatorsData"
import { StakingFeeEstimate } from "@ui/domains/Staking/shared/StakingFeeEstimate"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { TxProgress } from "@ui/domains/Transactions/TxProgress"
import { useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useDotNetwork, useToken } from "@ui/state/chaindata"
import { shortenAddress } from "@ui/util/shortenAddress"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Hex } from "viem"

import { useBittensorConvictionLockPayload } from "../hooks/useBittensorConvictionLockPayload"
import { getDTaoSubnetUnstakeInfo } from "../utils/dtaoSubnetUnstakeInfo"
import { BittensorConvictionLockAmountField } from "./BittensorConvictionLockAmountField"
import { BittensorConvictionLockConfirm } from "./BittensorConvictionLockConfirm"
import { BittensorLockTypePicker } from "./BittensorLockTypePicker"
import { ConvictionLockHotkeyPicker } from "./ConvictionLockHotkeyPicker"

export const BITTENSOR_LOCK_MODAL_CONTAINER_ID = "bittensor-conviction-lock-modal"

/**
 * Conviction lock wizard: locks already-staked alpha on a subnet to a hotkey for governance
 * conviction. Steps: form → confirm → tx progress. Adapts to an existing lock (top-up, forced
 * hotkey) and offers a decaying/perpetual choice.
 */
type Step = "form" | "confirm" | "submitted"

type BittensorConvictionLockContentProps = {
  networkId: DotNetworkId
  netuid: number
  seedAddress?: string
  seedHotkey?: string
  onClose: () => void
}

export const BittensorConvictionLockContent: FC<BittensorConvictionLockContentProps> = ({
  networkId,
  netuid,
  seedAddress,
  seedHotkey,
  onClose,
}) => {
  const { t } = useTranslation()

  const [step, setStep] = useState<Step>("form")
  const [activePicker, setActivePicker] = useState<"account" | "hotkey" | "lockType" | null>(null)
  const [address, setAddress] = useState(seedAddress ?? "")
  const [selectedHotkey, setSelectedHotkey] = useState<string | null>(seedHotkey ?? null)
  const [plancks, setPlancks] = useState<bigint | null>(null)
  const [makePerpetual, setMakePerpetual] = useState(false)
  const [submittedHash, setSubmittedHash] = useState<Hex | null>(null)

  const accounts = useAccounts("owned")
  const bittensor = useDotNetwork(networkId)
  const allBalances = useBalances("owned")

  // only already-staked alpha can be locked: restrict to accounts with stake on this subnet
  const eligibleAccounts = useMemo(() => {
    if (!bittensor) return []
    return accounts.filter(
      (a) =>
        isAccountCompatibleWithNetwork(bittensor, a) &&
        getDTaoSubnetUnstakeInfo(allBalances, a.address, networkId, netuid).stakedTotal > 0n
    )
  }, [accounts, allBalances, bittensor, networkId, netuid])

  // keep a valid account selected
  useEffect(() => {
    if (!eligibleAccounts.length) return
    if (!address || !eligibleAccounts.some((a) => isAddressEqual(a.address, address)))
      setAddress(eligibleAccounts[0].address)
  }, [address, eligibleAccounts])

  const subnetUnstakeInfo = useMemo(
    () => (address ? getDTaoSubnetUnstakeInfo(allBalances, address, networkId, netuid) : null),
    [allBalances, address, networkId, netuid]
  )

  const existingLock = subnetUnstakeInfo?.convictionLock ?? null
  const existingLockAmount = existingLock?.amount ?? 0n
  const isTopUp = !!existingLock
  const isAlreadyPerpetual = existingLock?.lockType === "perpetual"
  // "available balance" is the account's full stake on the subnet; the amount field holds the TARGET
  // total to lock, which can be raised up to this ceiling
  const stakedTotal = subnetUnstakeInfo?.stakedTotal ?? 0n

  // the extrinsic needs the increase (lock_stake does locked_mass += amount), not the target total
  const lockDelta = typeof plancks === "bigint" ? plancks - existingLockAmount : null

  // a lock is keyed to one hotkey: the chain forces top-ups to reuse it, otherwise the user picks
  const effectiveHotkey = existingLock?.hotkey ?? selectedHotkey

  // pre-fill the amount with the current lock so the user can only increase it (top-up). The subnet
  // is fixed, so the lock changes only with the account: re-seed on account change, gated by address
  // identity so balance polls (which re-derive a decayed lock amount) never clobber an in-progress edit
  const refSeededAddress = useRef<string | null>(null)
  useEffect(() => {
    if (!address) return
    if (refSeededAddress.current === address) return
    refSeededAddress.current = address
    setPlancks(existingLock ? existingLock.amount : null)
  }, [address, existingLock])

  const baseTokenId = useMemo(() => subDTaoTokenId(networkId, netuid), [networkId, netuid])
  const baseToken = useToken(baseTokenId, "substrate-dtao")
  const decimals = Number(baseToken?.decimals ?? TAO_DECIMALS)
  const symbol = `SN${netuid}`
  const subnetLabel = baseToken?.subnetName ? `${netuid} · ${baseToken.subnetName}` : symbol

  const { taoTokenId } = useSubnetTokens(netuid)

  const { combinedValidatorsData } = useCombinedBittensorValidatorsData(netuid)
  const hotkeyName = useMemo(() => {
    if (!effectiveHotkey) return null
    return (
      combinedValidatorsData.find((v) => v.hotkey === effectiveHotkey)?.name ||
      shortenAddress(effectiveHotkey, 6, 6)
    )
  }, [combinedValidatorsData, effectiveHotkey])

  const lockTypeLabel =
    isAlreadyPerpetual || makePerpetual ? t("Perpetual Lock") : t("Decaying Lock")

  const { payload, txMetadata, feeEstimate, isLoadingFeeEstimate, errorFeeEstimate } =
    useBittensorConvictionLockPayload({
      networkId,
      address: address || null,
      hotkey: effectiveHotkey,
      netuid,
      amount: lockDelta,
      makePerpetual,
      isAlreadyPerpetual,
      feeAmount: stakedTotal,
    })

  const errorMessage = useMemo(() => {
    if (stakedTotal <= 0n) return t("This account has no stake on this subnet")
    if (typeof plancks !== "bigint") return null
    if (isTopUp && plancks < existingLockAmount)
      return t("A lock can only be increased, not reduced")
    if (plancks > stakedTotal) return t("Amount exceeds your stake on this subnet")
    return null
  }, [stakedTotal, plancks, isTopUp, existingLockAmount, t])

  const canContinue =
    !!effectiveHotkey &&
    typeof lockDelta === "bigint" &&
    lockDelta > 0n &&
    typeof plancks === "bigint" &&
    plancks <= stakedTotal &&
    !!payload

  const handleSelectAccount = useCallback((addr: string) => {
    setAddress(addr)
    // a different account may carry its own lock/hotkey constraints; the pre-fill effect re-seeds
    // the amount from the new account's existing lock (if any)
    setSelectedHotkey(null)
    setActivePicker(null)
  }, [])

  const handleSelectHotkey = useCallback((hotkey: string) => {
    setSelectedHotkey(hotkey)
    setActivePicker(null)
  }, [])

  const handleSubmitted = useCallback((hash: Hex) => {
    setSubmittedHash(hash)
    setStep("submitted")
  }, [])

  if (step === "submitted" && submittedHash)
    return (
      <div className="size-full p-12">
        <TxProgress hash={submittedHash} networkIdOrHash={networkId} onClose={onClose} />
      </div>
    )

  if (
    step === "confirm" &&
    address &&
    effectiveHotkey &&
    typeof lockDelta === "bigint" &&
    lockDelta > 0n
  )
    return (
      <BittensorConvictionLockConfirm
        networkId={networkId}
        address={address}
        hotkey={effectiveHotkey}
        amount={lockDelta}
        makePerpetual={makePerpetual}
        isAlreadyPerpetual={isAlreadyPerpetual}
        isTopUp={isTopUp}
        existingLockAmount={existingLockAmount}
        symbol={symbol}
        tokenId={baseTokenId}
        taoTokenId={taoTokenId}
        payload={payload}
        txMetadata={txMetadata}
        feeEstimate={feeEstimate}
        isLoadingFeeEstimate={isLoadingFeeEstimate}
        errorFeeEstimate={errorFeeEstimate}
        onBack={() => setStep("form")}
        onClose={onClose}
        onSubmitted={handleSubmitted}
      />
    )

  if (activePicker === "hotkey")
    return (
      <WizardModalDialog
        title={t("Select hotkey")}
        onBackClick={() => setActivePicker(null)}
        onCloseClick={onClose}
        contentClassName="p-0! overflow-hidden flex flex-col"
      >
        <ConvictionLockHotkeyPicker
          networkId={networkId}
          netuid={netuid}
          address={address || null}
          hotkey={effectiveHotkey}
          onSelect={handleSelectHotkey}
        />
      </WizardModalDialog>
    )

  return (
    <WizardModalDialog
      title={t("Conviction lock")}
      onCloseClick={onClose}
      contentClassName="overflow-hidden flex flex-col gap-8"
    >
      <ScrollContainer className="grow" innerClassName="flex w-full flex-col gap-8">
        <div className="flex flex-col gap-4 rounded bg-grey-900 px-8 py-6 text-body-secondary leading-[140%]">
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Subnet")}</div>
            <div className="flex min-w-0 items-center gap-4 text-body">
              <TokenLogo className="shrink-0 text-lg" tokenId={baseTokenId} />
              <div className="truncate">{subnetLabel}</div>
            </div>
          </div>
          <div className="flex h-16 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Account")}</div>
            <AddressPillButton
              className="max-w-65!"
              address={address || null}
              genesisHash={bittensor?.genesisHash}
              onClick={() => setActivePicker("account")}
            />
          </div>
        </div>

        <BittensorConvictionLockAmountField
          tokenId={baseTokenId}
          decimals={decimals}
          symbol={symbol}
          plancks={plancks}
          maxPlancks={stakedTotal}
          onChange={setPlancks}
          errorMessage={errorMessage}
        />

        <div className="flex flex-col gap-1 rounded bg-grey-900 px-8 py-6 text-body-secondary text-xs leading-paragraph">
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Existing conviction lock")}</div>
            <TokensAndFiat
              planck={existingLockAmount}
              tokenId={baseTokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Available balance")}</div>
            <TokensAndFiat
              planck={stakedTotal}
              tokenId={baseTokenId}
              noCountUp
              tokensClassName="text-body"
            />
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Lock type")}</div>
            <PillButton
              className="h-12 max-w-full px-4!"
              disabled={isAlreadyPerpetual}
              onClick={() => setActivePicker("lockType")}
            >
              <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                <div className="grow truncate leading-base">{lockTypeLabel}</div>
              </div>
            </PillButton>
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Hotkey")}</div>
            {effectiveHotkey ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex max-w-full overflow-hidden">
                    <PillButton
                      className="h-12 max-w-full px-4! disabled:pointer-events-none"
                      disabled={isTopUp}
                      onClick={() => setActivePicker("hotkey")}
                    >
                      <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                        <div className="grow truncate leading-base">{hotkeyName}</div>
                      </div>
                    </PillButton>
                  </span>
                </TooltipTrigger>
                {isTopUp && (
                  <TooltipContent>
                    {t("Adding to your existing lock, keyed to the same hotkey.")}
                  </TooltipContent>
                )}
              </Tooltip>
            ) : (
              <PillButton
                className="h-12 max-w-full px-4!"
                onClick={() => setActivePicker("hotkey")}
              >
                <div className="flex h-12 max-w-full flex-nowrap items-center gap-4 overflow-x-hidden text-body">
                  {t("Select hotkey")}
                </div>
              </PillButton>
            )}
          </div>
          <div className="flex h-12 items-center justify-between gap-8">
            <div className="whitespace-nowrap">{t("Estimated fee")}</div>
            <div className="overflow-hidden">
              <StakingFeeEstimate
                plancks={feeEstimate}
                tokenId={taoTokenId}
                isLoading={isLoadingFeeEstimate}
                error={errorFeeEstimate}
              />
            </div>
          </div>
        </div>
      </ScrollContainer>

      <Button
        primary
        onClick={() => setStep("confirm")}
        disabled={!canContinue}
        className="shrink-0"
      >
        {t("Review")}
      </Button>

      <AccountPicker
        isOpen={activePicker === "account"}
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        accounts={eligibleAccounts}
        selectedAddress={address}
        onSelect={handleSelectAccount}
        onDismiss={() => setActivePicker(null)}
      />
      <BittensorLockTypePicker
        isOpen={activePicker === "lockType"}
        containerId={BITTENSOR_LOCK_MODAL_CONTAINER_ID}
        value={isAlreadyPerpetual || makePerpetual ? "perpetual" : "decaying"}
        symbol={symbol}
        onSelect={(value) => setMakePerpetual(value === "perpetual")}
        onDismiss={() => setActivePicker(null)}
      />
    </WizardModalDialog>
  )
}
