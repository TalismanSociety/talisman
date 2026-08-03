import { log } from "@common/log"
import { isAccountOwned, isAccountPlatformEthereum } from "@core/domains/keyring/exports"
import type { Balances } from "@talismn/balances"
import type { EthNetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { planckToTokens } from "@talismn/util"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { notify } from "@ui/components/Notifications"
import { PillButton } from "@ui/components/PillButton"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountPillButton } from "@ui/domains/Account/AccountPillButton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AmountEdit } from "@ui/domains/Earn/shared/AmountEdit"
import { FormFieldSet, FormFieldSetRow } from "@ui/domains/Earn/shared/FormFieldSet"
import {
  compareAccountsByTokenBalances,
  SenderAccountPicker,
  type SenderAccountPickerIsAccountDisabled,
} from "@ui/domains/Earn/shared/SenderAccountPicker"
import { invalidateNonceQueries, useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { useEvmTransactionRiskAnalysis } from "@ui/domains/Sign/risk-analysis/ethereum/useEvmTransactionRiskAnalysis"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import seekSinglePoolStakingAbi from "@ui/domains/Staking/Seek/seekSinglePoolStakingAbi"
import { type ReplacementCallbackArgs, TxProgress } from "@ui/domains/Transactions"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useTransaction } from "@ui/state/transactions"
import { cn } from "@ui/util/cn"
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { encodeFunctionData, erc20Abi } from "viem"
import { SeekStakeConfirm } from "./SeekStakeConfirm"
import {
  NetworkDisplay,
  SEEK_STAKING_MODAL_CONTAINER_ID,
  SeekExpectedRewards,
  SeekNetworkFeeRows,
  SeekUnstakingPeriod,
  TransactionError,
} from "./SeekStakingModalShared"
import { removeSeekStakingPositionCache } from "./seekStakingCache"
import {
  SEEK_STAKING_QUERY_KEY,
  useSeekErc20Allowance,
  useSeekStakingConfig,
  useSeekStakingMetadata,
  useSeekStakingPosition,
} from "./useSeekStaking"
import { type SeekStakingAction, useSeekStakingModal } from "./useSeekStakingModal"

type TFunc = ReturnType<typeof useTranslation>["t"]

// Use literal t("...") calls (not t(map[action])) so i18next-parser can statically extract them.
const getActionLabel = (t: TFunc, action: SeekStakingAction): string => {
  switch (action) {
    case "stake":
      return t("Stake SEEK")
    case "requestWithdrawal":
      return t("Request Unstake")
    case "completeWithdrawal":
      return t("Complete Unstake")
    case "getReward":
      return t("Claim Rewards")
    case "cancelWithdrawal":
      return t("Cancel Unstake")
  }
}

const getModalTitle = (t: TFunc, action: SeekStakingAction): string => {
  switch (action) {
    case "stake":
      return t("Enter Position")
    case "requestWithdrawal":
      return t("Exit Position")
    case "completeWithdrawal":
      return t("Complete Unstake")
    case "getReward":
      return t("Claim Rewards")
    case "cancelWithdrawal":
      return t("Cancel Unstake")
  }
}

const isAmountAction = (action: SeekStakingAction) =>
  action === "stake" || action === "requestWithdrawal"

const getTransferableTokenBalance = (balances: Balances, address: string, tokenId: TokenId) =>
  balances.find(
    (balance) => balance.tokenId === tokenId && isAddressEqual(balance.address, address)
  ).sum.planck.transferable

export const SeekStakingModal: FC = () => {
  const { isOpen, close, args } = useSeekStakingModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id={SEEK_STAKING_MODAL_CONTAINER_ID}>
        {args && (
          <SeekStakingForm action={args.action} initialAddress={args.address} isOpen={isOpen} />
        )}
      </PopupSizeModalContainer>
    </Modal>
  )
}

const SeekStakingForm: FC<{
  action: SeekStakingAction
  initialAddress?: string
  isOpen: boolean
}> = ({ action, initialAddress, isOpen }) => {
  const { t } = useTranslation()
  const { close } = useSeekStakingModal()
  const config = useSeekStakingConfig()
  const token = useToken(config.tokenId)
  const network = useNetworkById(config.networkId, "ethereum")
  const accounts = useAccounts("owned")
  const balances = useBalances("owned")
  const [address, setAddress] = useState<string | null>(initialAddress ?? null)
  const [amount, setAmount] = useState<bigint | null>(null)
  const [submittedHash, setSubmittedHash] = useState<string | null>(null)
  // staking follows the yieldxyz wizard UX: the form leads to a confirm screen which walks the
  // user through the required transactions (ERC-20 approval then stake) with a visible stepper
  const [isConfirmStep, setIsConfirmStep] = useState(false)
  // frozen when entering the confirm screen so the stepper keeps displaying both steps (with the
  // second one active) once the approval is confirmed
  const [hasApprovalStep, setHasApprovalStep] = useState(false)
  // transaction submitted from the confirm screen, tracked in-place (no progress screen takeover)
  const [pending, setPending] = useState<{ hash: string; isApproval: boolean } | null>(null)
  const refProcessedHash = useRef<string | null>(null)
  const {
    isOpen: isAccountPickerOpen,
    open: openAccountPicker,
    close: closeAccountPicker,
  } = useOpenClose()
  const queryClient = useQueryClient()

  const accountOptions = useMemo(() => {
    const ethereumAccounts = accounts.filter((account) => isAccountPlatformEthereum(account))
    if (!token)
      return ethereumAccounts.sort(
        (a, b) => a.name?.localeCompare(b.name || "") || a.address.localeCompare(b.address)
      )

    return ethereumAccounts
      .map((account) => ({
        ...account,
        balances: balances.find(
          (balance) =>
            balance.tokenId === token.id && isAddressEqual(balance.address, account.address)
        ),
      }))
      .sort(compareAccountsByTokenBalances)
  }, [accounts, balances, token])
  // the modal is mounted globally, outside the PortfolioNavigationProvider, so this is undefined
  // when opened from contexts like the popup claim flow
  const { selectedAccounts } = usePortfolioNavigation()
  const selectedEthereumAccountAddresses = useMemo(
    () =>
      (selectedAccounts ?? [])
        .filter((account) => isAccountOwned(account) && isAccountPlatformEthereum(account))
        .map((account) => account.address),
    [selectedAccounts]
  )

  // default to the highest-balance *selected* ethereum account (the user reached this form from a
  // selected-accounts context), falling back to the highest-balance owned account otherwise
  const defaultAddress = useMemo(() => {
    if (!accountOptions.length) return null
    const selectedSet = new Set(selectedEthereumAccountAddresses.map((a) => a.toLowerCase()))
    const preferred = accountOptions.find((acc) => selectedSet.has(acc.address.toLowerCase()))
    return (preferred ?? accountOptions[0]).address
  }, [accountOptions, selectedEthereumAccountAddresses])

  useEffect(() => {
    if (address || !defaultAddress) return
    setAddress(defaultAddress)
  }, [address, defaultAddress])

  useEffect(() => {
    if (isOpen) {
      setSubmittedHash(null)
      setIsConfirmStep(false)
      setHasApprovalStep(false)
      setPending(null)
      refProcessedHash.current = null
    }
  }, [isOpen])

  const account = useAccountByAddress(address ?? undefined)
  const position = useSeekStakingPosition(address ?? undefined)
  const metadata = useSeekStakingMetadata()
  const rewardToken = useToken(metadata.data?.rewardTokenId)
  const allowance = useSeekErc20Allowance(address, action === "stake" ? amount : null)

  const transferable = useMemo(
    () => (address && token ? getTransferableTokenBalance(balances, address, token.id) : 0n),
    [address, balances, token]
  )

  const maxAmount = action === "stake" ? transferable : (position.data?.staked ?? 0n)

  const handleMaxClick = useCallback(() => setAmount(maxAmount), [maxAmount])
  const handleReplacementComplete = useCallback((args: ReplacementCallbackArgs) => {
    setSubmittedHash(args.txId)
  }, [])
  const handleSelectAccount = useCallback(
    (nextAddress: string) => {
      setAddress(nextAddress)
      closeAccountPicker()
    },
    [closeAccountPicker]
  )
  const isAccountDisabled = useCallback<SenderAccountPickerIsAccountDisabled>(
    (_account, accountBalances) =>
      action === "stake" ? !accountBalances.sum.planck.transferable : false,
    [action]
  )

  const error = useMemo(() => {
    if (!token || !account || !isAccountOwned(account) || !isAccountPlatformEthereum(account))
      return t("Select an owned Ethereum account")
    if (!isAmountAction(action)) return null
    if (!amount || amount <= 0n) return t("Enter an amount")
    if (amount > maxAmount)
      return action === "requestWithdrawal"
        ? t("Amount exceeds staked balance")
        : t("Amount exceeds available balance")
    if (
      action === "stake" &&
      metadata.data?.minStakeAmount &&
      amount < metadata.data.minStakeAmount
    )
      return t("Minimum stake is {{amount}} {{symbol}}", {
        amount: planckToTokens(metadata.data.minStakeAmount.toString(), token.decimals),
        symbol: token.symbol,
      })
    if (action === "requestWithdrawal") {
      if ((position.data?.pendingWithdrawal.amount ?? 0n) > 0n)
        return t("Complete or cancel your pending unstake before requesting another one")
      const remaining = (position.data?.staked ?? 0n) - amount
      if (
        remaining > 0n &&
        metadata.data?.minStakeAmount &&
        remaining < metadata.data.minStakeAmount
      )
        return t("Unstake all, or leave at least {{amount}} {{symbol}} staked", {
          amount: planckToTokens(metadata.data.minStakeAmount.toString(), token.decimals),
          symbol: token.symbol,
        })
    }
    return null
  }, [account, action, amount, maxAmount, metadata.data, position.data, t, token])

  const txRequest = useMemo(() => {
    if (!address || error || !token) return undefined

    if (action === "stake") {
      if (!amount) return undefined
      const needsApproval = (allowance.data ?? 0n) < amount
      return {
        to: needsApproval ? config.tokenAddress : config.stakingContractAddress,
        from: address as `0x${string}`,
        data: needsApproval
          ? encodeFunctionData({
              abi: erc20Abi,
              functionName: "approve",
              args: [config.stakingContractAddress, amount],
            })
          : encodeFunctionData({
              abi: seekSinglePoolStakingAbi,
              functionName: "stake",
              args: [amount],
            }),
        value: 0n,
      }
    }

    const data =
      action === "requestWithdrawal"
        ? amount
          ? encodeFunctionData({
              abi: seekSinglePoolStakingAbi,
              functionName: "requestWithdrawal",
              args: [amount],
            })
          : null
        : encodeFunctionData({
            abi: seekSinglePoolStakingAbi,
            functionName: action,
          })

    if (!data) return undefined
    return {
      to: config.stakingContractAddress,
      from: address as `0x${string}`,
      data,
      value: 0n,
    }
  }, [
    action,
    address,
    allowance.data,
    amount,
    config.stakingContractAddress,
    config.tokenAddress,
    error,
    token,
  ])

  const ethTx = useEthTransaction(txRequest, config.networkId as EthNetworkId)

  const riskAnalysis = useEvmTransactionRiskAnalysis({
    networkId: config.networkId as EthNetworkId,
    tx: action === "stake" ? txRequest : undefined,
    disableCriticalPane: true,
  })

  const isApproval = action === "stake" && amount != null && (allowance.data ?? 0n) < amount
  const isCompleteLocked =
    action === "completeWithdrawal" &&
    Number(position.data?.pendingWithdrawal.unlockTimestamp ?? 0n) * 1000 > Date.now()

  const refreshSeekStakingQueries = useCallback(
    async (removePersistedPosition: boolean) => {
      try {
        if (removePersistedPosition && address) {
          await removeSeekStakingPositionCache({
            networkId: config.networkId as EthNetworkId,
            stakingContractAddress: config.stakingContractAddress,
            address,
          })
        }
      } catch (err) {
        log.error("Error removing persisted SEEK staking cache", err)
      } finally {
        await queryClient.invalidateQueries({ queryKey: [SEEK_STAKING_QUERY_KEY] })
      }
    },
    [address, config.networkId, config.stakingContractAddress, queryClient]
  )

  const handleSubmit = useCallback((hash: string) => {
    setSubmittedHash(hash)
  }, [])

  const handleReviewClick = useCallback(() => {
    setHasApprovalStep(isApproval)
    setIsConfirmStep(true)
  }, [isApproval])

  const handleConfirmBack = useCallback(() => {
    setIsConfirmStep(false)
  }, [])

  const handleConfirmSubmit = useCallback(
    (hash: string) => {
      refProcessedHash.current = null
      setPending({ hash, isApproval })
    },
    [isApproval]
  )

  // walks the confirm screen transactions: on approval success, refresh the allowance before
  // re-enabling the submit button so it flips straight to the stake transaction; on stake
  // success, refresh the position and close the modal
  const pendingTx = useTransaction(pending?.hash ?? "")
  useEffect(() => {
    if (!pending || !pendingTx || refProcessedHash.current === pending.hash) return

    switch (pendingTx.status) {
      case "success":
        refProcessedHash.current = pending.hash
        notify({ type: "success", title: t("Success"), subtitle: t("Transaction confirmed") })
        if (pending.isApproval) {
          // the nonce is cached for as long as the form is mounted: refresh it along with the
          // allowance or the stake transaction is prepared with the nonce the approval just spent
          void Promise.all([
            refreshSeekStakingQueries(false),
            invalidateNonceQueries(queryClient),
          ]).finally(() => setPending(null))
        } else {
          void refreshSeekStakingQueries(true)
          close()
        }
        break
      case "error":
        refProcessedHash.current = pending.hash
        notify({ type: "error", title: t("Error"), subtitle: t("Transaction failed") })
        setPending(null)
        break
      case "replaced":
        // sped up or cancelled from the transactions list: refresh and let the user resume
        refProcessedHash.current = pending.hash
        void Promise.all([
          refreshSeekStakingQueries(false),
          invalidateNonceQueries(queryClient),
        ]).finally(() => setPending(null))
        break
      default:
        break
    }
  }, [close, pending, pendingTx, queryClient, refreshSeekStakingQueries, t])

  // refresh the cached position once a transaction submitted via the progress screen confirms
  const submittedTx = useTransaction(submittedHash ?? "")
  useEffect(() => {
    if (!submittedHash || submittedTx?.status !== "success") return
    void refreshSeekStakingQueries(true)
  }, [refreshSeekStakingQueries, submittedHash, submittedTx?.status])

  if (!token) return null

  if (submittedHash)
    return (
      <div className="size-full p-12 pt-24">
        <TxProgress
          hash={submittedHash}
          networkIdOrHash={config.networkId}
          onClose={close}
          containerId={SEEK_STAKING_MODAL_CONTAINER_ID}
          onReplacementComplete={handleReplacementComplete}
        />
      </div>
    )

  if (action === "stake" && isConfirmStep && address && amount)
    return (
      <SeekStakeConfirm
        token={token}
        amount={amount}
        address={address}
        networkId={config.networkId}
        apr={metadata.data?.apr}
        ethTx={ethTx}
        feeTokenId={network?.nativeTokenId}
        riskAnalysis={riskAnalysis}
        hasApprovalStep={hasApprovalStep}
        isApproval={isApproval}
        isProcessing={!!pending}
        isPreparing={ethTx.isLoading || allowance.isFetching}
        onBackClick={pending ? undefined : handleConfirmBack}
        onCloseClick={close}
        onSubmit={handleConfirmSubmit}
      />
    )

  // computed after the `if (!token) return null` guard above so `token` is non-null here, making
  // the fallback (and thus the prop passed to SeekRewardsSummary) a non-nullable Token
  const displayRewardToken = rewardToken ?? token
  const submitLabel = getActionLabel(t, action)
  const modalTitle = getModalTitle(t, action)
  const displayError = ethTx.error ?? (!isAmountAction(action) ? (error ?? undefined) : undefined)

  return (
    <WizardModalDialog className="size-full border-none" title={modalTitle} onCloseClick={close}>
      <div className="flex size-full flex-col gap-8 overflow-hidden">
        <FormFieldSet>
          <FormFieldSetRow label={t("Account")} className="h-[2em]">
            <SeekAccountPillButton address={address} onClick={openAccountPicker} />
          </FormFieldSetRow>
        </FormFieldSet>

        {isAmountAction(action) ? (
          <div className="grow">
            <AmountEdit
              tokenId={token.id}
              value={amount}
              error={error}
              onValueChanged={setAmount}
              onMaxClick={handleMaxClick}
            />
          </div>
        ) : (
          <div className="flex grow items-center">
            {action === "cancelWithdrawal" || action === "completeWithdrawal" ? (
              <SeekPendingUnstakeSummary
                token={token}
                pending={position.data?.pendingWithdrawal.amount ?? 0n}
              />
            ) : (
              <SeekRewardsSummary token={displayRewardToken} earned={position.data?.earned ?? 0n} />
            )}
          </div>
        )}

        <div className="flex w-full flex-col gap-4">
          <SeekPositionDetails
            action={action}
            token={token}
            networkId={config.networkId}
            available={maxAmount}
            staked={position.data?.staked ?? 0n}
            pending={position.data?.pendingWithdrawal.amount ?? 0n}
            withdrawDelay={metadata.data?.withdrawDelay ?? null}
            expectedApr={metadata.data?.apr}
          />
          {action !== "stake" && (
            <FormFieldSet>
              <SeekNetworkFeeRows ethTx={ethTx} feeTokenId={network?.nativeTokenId} variant="xs" />
            </FormFieldSet>
          )}
        </div>

        {action === "completeWithdrawal" && isCompleteLocked && (
          <div className="rounded bg-grey-850 p-6 text-body-secondary text-sm">
            {t("Your unstake is still locked until {{date}}", {
              date: new Date(
                Number(position.data?.pendingWithdrawal.unlockTimestamp ?? 0n) * 1000
              ).toLocaleString(),
            })}
          </div>
        )}

        <TransactionError error={displayError} errorDetails={ethTx.errorDetails} />

        {action === "stake" ? (
          <Button
            primary
            className="w-full"
            disabled={!!error || allowance.isLoading}
            onClick={handleReviewClick}
          >
            {t("Review")}
          </Button>
        ) : (
          <TxSubmitButton
            containerId={SEEK_STAKING_MODAL_CONTAINER_ID}
            tx={
              ethTx.transaction
                ? {
                    platform: "ethereum",
                    networkId: config.networkId,
                    payload: ethTx.transaction,
                  }
                : null
            }
            label={submitLabel}
            className="w-full"
            disabled={!!error || isCompleteLocked || !!ethTx.error || !ethTx.transaction}
            isProcessing={ethTx.isLoading || allowance.isFetching}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      <SeekAccountPickerModal
        isOpen={isAccountPickerOpen}
        address={address}
        tokenId={token.id}
        isAccountDisabled={isAccountDisabled}
        onBackClick={closeAccountPicker}
        onCloseClick={close}
        onSelect={handleSelectAccount}
      />
    </WizardModalDialog>
  )
}

const SeekAccountPillButton: FC<{
  address: string | null
  disabled?: boolean
  onClick: () => void
}> = ({ address, disabled, onClick }) => {
  const { t } = useTranslation()

  if (address)
    return (
      <AccountPillButton
        className={cn("w-full!", disabled && "pointer-events-none opacity-70")}
        address={address}
        onClick={disabled ? undefined : onClick}
      />
    )

  return (
    <PillButton disabled={disabled} className="h-16 w-full! px-4!" onClick={onClick} size="base">
      {t("Select Account")}
    </PillButton>
  )
}

const SeekAccountPickerModal: FC<{
  isOpen: boolean
  address: string | null
  tokenId: string
  isAccountDisabled: SenderAccountPickerIsAccountDisabled
  onBackClick: () => void
  onCloseClick: () => void
  onSelect: (address: string) => void
}> = ({ isOpen, address, tokenId, isAccountDisabled, onBackClick, onCloseClick, onSelect }) => {
  const { t } = useTranslation()

  return (
    <Modal
      containerId={SEEK_STAKING_MODAL_CONTAINER_ID}
      isOpen={isOpen}
      onDismiss={onBackClick}
      className="relative z-50 size-full"
    >
      <WizardModalDialog
        className="size-full border-none"
        contentClassName="p-0"
        title={t("Select Account")}
        onBackClick={onBackClick}
        onCloseClick={onCloseClick}
      >
        <SenderAccountPicker
          address={address}
          tokenId={tokenId}
          isAccountDisabled={isAccountDisabled}
          onSelect={onSelect}
        />
      </WizardModalDialog>
    </Modal>
  )
}

const SeekPositionDetails: FC<{
  action: SeekStakingAction
  token: Token
  networkId: EthNetworkId
  available: bigint
  staked: bigint
  pending: bigint
  withdrawDelay: bigint | null
  expectedApr?: number | null
}> = ({ action, token, networkId, available, staked, pending, withdrawDelay, expectedApr }) => {
  const { t } = useTranslation()
  const isStake = action === "stake"
  const isCancelWithdrawal = action === "cancelWithdrawal"
  const isRequestWithdrawal = action === "requestWithdrawal"
  const primaryBalanceLabel =
    action === "stake"
      ? t("Available Balance")
      : isCancelWithdrawal
        ? t("Pending Unstake")
        : t("Position Balance")
  const primaryBalance = action === "stake" ? available : isCancelWithdrawal ? pending : staked

  return (
    <FormFieldSet>
      <FormFieldSetRow label={primaryBalanceLabel} variant="xs">
        <TokensAndFiat
          tokenId={token.id}
          planck={primaryBalance.toString()}
          noCountUp
          isBalance
          tokensClassName="text-body"
        />
      </FormFieldSetRow>

      {isRequestWithdrawal && (
        <FormFieldSetRow
          label={t("Unstaking Period")}
          description={t(
            "After requesting an unstake, this is how long the amount remains locked before you can complete the unstake."
          )}
          variant="xs"
        >
          <SeekUnstakingPeriod withdrawDelay={withdrawDelay} />
        </FormFieldSetRow>
      )}
      <FormFieldSetRow label={t("Network")} variant="xs">
        <NetworkDisplay networkId={networkId} />
      </FormFieldSetRow>
      <FormFieldSetRow label={t("DeFi Product")} variant="xs">
        {t("SEEK Staking")}
      </FormFieldSetRow>
      <FormFieldSetRow label={t("Provider")} variant="xs">
        {t("Talisman")}
      </FormFieldSetRow>
      {isStake && (
        <FormFieldSetRow label={t("Expected Rewards")} variant="xs">
          <SeekExpectedRewards apr={expectedApr} />
        </FormFieldSetRow>
      )}
      {isStake && (
        <FormFieldSetRow
          label={t("Unlock Period")}
          description={t(
            "After requesting an unstake, this is how long the amount remains locked before you can complete the unstake."
          )}
          variant="xs"
        >
          <SeekUnstakingPeriod withdrawDelay={withdrawDelay} />
        </FormFieldSetRow>
      )}
    </FormFieldSet>
  )
}

const SeekPendingUnstakeSummary: FC<{ token: Token; pending: bigint }> = ({ token, pending }) => {
  const { t } = useTranslation()

  return (
    <div className="w-full rounded p-8 text-center text-sm">
      <SummaryValue label={t("Pending Unstake")} tokenId={token.id} planck={pending} />
    </div>
  )
}

const SeekRewardsSummary: FC<{
  token: Token
  earned: bigint
}> = ({ token, earned }) => {
  const { t } = useTranslation()

  return (
    <div className="w-full rounded p-8 text-center text-sm">
      <SummaryValue label={t("Claimable")} tokenId={token.id} planck={earned} />
    </div>
  )
}

const SummaryValue: FC<{ label: string; tokenId: string; planck: bigint }> = ({
  label,
  tokenId,
  planck,
}) => (
  <div className="flex min-w-0 flex-col gap-4 overflow-hidden text-md">
    <div className="text-body-secondary">{label}</div>
    <TokensAndFiat
      tokenId={tokenId}
      planck={planck.toString()}
      withLogo
      noFiat
      tokensClassName="truncate"
    />
  </div>
)
