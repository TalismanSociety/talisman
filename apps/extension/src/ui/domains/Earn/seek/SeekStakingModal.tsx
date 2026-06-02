import { log } from "@common/log"
import { isAccountOwned, isAccountPlatformEthereum } from "@core/domains/keyring/exports"
import type { Balances } from "@talismn/balances"
import type { EthNetworkId, Token, TokenId } from "@talismn/chaindata-provider"
import { isAddressEqual } from "@talismn/crypto"
import { AlertCircleIcon } from "@talismn/icons"
import { planckToTokens } from "@talismn/util"
import { useQueryClient } from "@tanstack/react-query"
import { Modal } from "@ui/components/Modal"
import { PillButton } from "@ui/components/PillButton"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { Tooltip, TooltipContent, TooltipTrigger } from "@ui/components/Tooltip"
import { WizardModalDialog } from "@ui/components/WizardModalDialog"
import { AccountPillButton } from "@ui/domains/Account/AccountPillButton"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { AmountEdit } from "@ui/domains/Earn/shared/AmountEdit"
import { FormFieldSet, FormFieldSetRow } from "@ui/domains/Earn/shared/FormFieldSet"
import { SenderAccountPicker } from "@ui/domains/Earn/shared/SenderAccountPicker"
import { EthFeeSelect } from "@ui/domains/Ethereum/GasSettings/EthFeeSelect"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { NetworkLogo } from "@ui/domains/Networks/NetworkLogo"
import { NetworkName } from "@ui/domains/Networks/NetworkName"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import seekSinglePoolStakingAbi from "@ui/domains/Staking/Seek/seekSinglePoolStakingAbi"
import { type ReplacementCallbackArgs, TxProgress } from "@ui/domains/Transactions"
import { useDateFnsLocale } from "@ui/hooks/useDateFnsLocale"
import { useOpenClose } from "@ui/hooks/useOpenClose"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useNetworkById, useToken } from "@ui/state/chaindata"
import { useTransaction } from "@ui/state/transactions"
import { cn } from "@ui/util/cn"
import { formatDuration, intervalToDuration } from "date-fns"
import { type FC, useCallback, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { encodeFunctionData, erc20Abi } from "viem"
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

const SEEK_STAKING_MODAL_CONTAINER_ID = "seek-staking-modal"

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
  // when an ERC-20 approval is in flight, we wait for it to confirm and then return to the form
  // (rather than showing a terminal progress screen) so the user can stake without reopening
  const [awaitingApproval, setAwaitingApproval] = useState(false)
  const {
    isOpen: isAccountPickerOpen,
    open: openAccountPicker,
    close: closeAccountPicker,
  } = useOpenClose()
  const queryClient = useQueryClient()

  const accountOptions = useMemo(
    () =>
      accounts
        .filter((account) => isAccountPlatformEthereum(account))
        .sort((a, b) => {
          if (!token)
            return a.name?.localeCompare(b.name || "") || a.address.localeCompare(b.address)

          const balanceA = getTransferableTokenBalance(balances, a.address, token.id)
          const balanceB = getTransferableTokenBalance(balances, b.address, token.id)

          if (balanceA > balanceB) return -1
          if (balanceA < balanceB) return 1

          return a.name?.localeCompare(b.name || "") || a.address.localeCompare(b.address)
        }),
    [accounts, balances, token]
  )
  const { selectedAccounts } = usePortfolioNavigation()
  const selectedEthereumAccountAddresses = useMemo(
    () =>
      selectedAccounts
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
      setAwaitingApproval(false)
    }
  }, [isOpen])

  const account = useAccountByAddress(address ?? undefined)
  const position = useSeekStakingPosition(address ?? undefined)
  const metadata = useSeekStakingMetadata()
  const allowance = useSeekErc20Allowance(address, action === "stake" ? amount : null)

  const transferable = useMemo(
    () => (address && token ? getTransferableTokenBalance(balances, address, token.id) : 0n),
    [address, balances, token]
  )

  const maxAmount = action === "stake" ? transferable : (position.data?.staked ?? 0n)
  const seekTokenAddress = useMemo(
    () => config.tokenId.split(":").at(-1) as `0x${string}`,
    [config.tokenId]
  )

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

  const error = useMemo(() => {
    if (!token || !account || !isAccountOwned(account) || !isAccountPlatformEthereum(account))
      return t("Select an owned Ethereum account")
    if (!isAmountAction(action)) return null
    if (!amount || amount <= 0n) return t("Enter an amount")
    if (amount > maxAmount) return t("Amount exceeds available balance")
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
        to: needsApproval ? seekTokenAddress : config.stakingContractAddress,
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
    error,
    seekTokenAddress,
    token,
  ])

  const ethTx = useEthTransaction(txRequest, config.networkId as EthNetworkId)

  const isApproval = action === "stake" && amount != null && (allowance.data ?? 0n) < amount
  const isCompleteLocked =
    action === "completeWithdrawal" &&
    Number(position.data?.pendingWithdrawal.unlockTimestamp ?? 0n) * 1000 > Date.now()

  const handleSubmit = useCallback(
    (hash: string) => {
      if (!isApproval && address) {
        void removeSeekStakingPositionCache({
          networkId: config.networkId as EthNetworkId,
          stakingContractAddress: config.stakingContractAddress,
          address,
          accountAddresses: selectedEthereumAccountAddresses,
        })
          .catch((err) => log.error("Error removing persisted SEEK staking cache", err))
          .finally(() => queryClient.invalidateQueries({ queryKey: [SEEK_STAKING_QUERY_KEY] }))
      } else {
        queryClient.invalidateQueries({ queryKey: [SEEK_STAKING_QUERY_KEY] })
      }
      setAwaitingApproval(isApproval)
      setSubmittedHash(hash)
    },
    [
      address,
      config.networkId,
      config.stakingContractAddress,
      isApproval,
      queryClient,
      selectedEthereumAccountAddresses,
    ]
  )

  // once the approval transaction confirms, refresh the allowance and return to the form so the
  // submit button flips from "Approve SEEK" to "Stake SEEK" within the same modal session
  const submittedTx = useTransaction(submittedHash ?? "")
  useEffect(() => {
    if (!awaitingApproval || submittedTx?.status !== "success") return
    queryClient.invalidateQueries({ queryKey: [SEEK_STAKING_QUERY_KEY] })
    setAwaitingApproval(false)
    setSubmittedHash(null)
  }, [awaitingApproval, queryClient, submittedTx?.status])

  if (!token) return null

  if (submittedHash)
    return (
      <div className="size-full p-12 pt-24">
        <TxProgress
          hash={submittedHash}
          networkIdOrHash={config.networkId}
          onClose={close}
          onReplacementComplete={handleReplacementComplete}
        />
      </div>
    )

  const submitLabel = isApproval ? t("Approve SEEK") : getActionLabel(t, action)
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
            {action === "cancelWithdrawal" ? (
              <SeekPendingUnstakeSummary
                token={token}
                pending={position.data?.pendingWithdrawal.amount ?? 0n}
              />
            ) : (
              <SeekRewardsSummary token={token} earned={position.data?.earned ?? 0n} />
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
          />
          <SeekNetworkFeeDetails
            ethTx={ethTx}
            feeTokenId={network?.nativeTokenId}
            containerId={SEEK_STAKING_MODAL_CONTAINER_ID}
          />
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
      </div>

      <SeekAccountPickerModal
        isOpen={isAccountPickerOpen}
        address={address}
        tokenId={token.id}
        allowZeroBalance={action !== "stake"}
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
  allowZeroBalance: boolean
  onBackClick: () => void
  onCloseClick: () => void
  onSelect: (address: string) => void
}> = ({ isOpen, address, tokenId, allowZeroBalance, onBackClick, onCloseClick, onSelect }) => {
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
          allowZeroBalance={allowZeroBalance}
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
}> = ({ action, token, networkId, available, staked, pending, withdrawDelay }) => {
  const { t } = useTranslation()
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
    </FormFieldSet>
  )
}

const SeekUnstakingPeriod: FC<{ withdrawDelay: bigint | null }> = ({ withdrawDelay }) => {
  const { t } = useTranslation()
  const locale = useDateFnsLocale()

  return useMemo(() => {
    if (withdrawDelay === null) return t("N/A")
    if (withdrawDelay <= 0n) return t("None")

    const duration = intervalToDuration({ start: 0, end: Number(withdrawDelay) * 1000 })
    return formatDuration(duration, { locale })
  }, [locale, t, withdrawDelay])
}

const SeekNetworkFeeDetails: FC<{
  ethTx: ReturnType<typeof useEthTransaction>
  feeTokenId?: TokenId
  containerId: string
}> = ({ ethTx, feeTokenId, containerId }) => {
  const { t } = useTranslation()
  const { transaction, txDetails } = ethTx

  return (
    <FormFieldSet>
      <FormFieldSetRow label={t("Transaction Priority")} variant="xs">
        {!!transaction && !!txDetails && !!feeTokenId ? (
          <EthFeeSelect
            key={transaction.nonce?.toString() ?? "pending"}
            tokenId={feeTokenId}
            drawerContainerId={containerId}
            gasSettingsByPriority={ethTx.gasSettingsByPriority}
            priority={ethTx.priority}
            txDetails={txDetails}
            networkUsage={ethTx.networkUsage}
            tx={transaction}
            setCustomSettings={ethTx.setCustomSettings}
            onChange={ethTx.setPriority}
            className="h-8 rounded-xs text-body"
          />
        ) : (
          <FeePlaceholder isLoading={ethTx.isLoading} />
        )}
      </FormFieldSetRow>
      <FormFieldSetRow label={t("Network Fee")} variant="xs" valueClassName="text-body-secondary">
        {!!txDetails && !!feeTokenId ? (
          <TokensAndFiat
            planck={txDetails.estimatedFee.toString()}
            tokenId={feeTokenId}
            tokensClassName="text-body"
          />
        ) : (
          <FeePlaceholder isLoading={ethTx.isLoading} />
        )}
      </FormFieldSetRow>
    </FormFieldSet>
  )
}

const FeePlaceholder: FC<{ isLoading?: boolean }> = ({ isLoading }) => {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        "rounded-xs text-body-secondary",
        isLoading && "animate-pulse bg-body-disabled text-body-disabled"
      )}
    >
      {isLoading ? t("Estimating") : "-"}
    </div>
  )
}

const NetworkDisplay: FC<{ networkId: string }> = ({ networkId }) => (
  <div className="flex w-full items-center gap-2 overflow-hidden text-body">
    <NetworkLogo className="size-8" networkId={networkId} />
    <NetworkName className="truncate" networkId={networkId} />
  </div>
)

const TransactionError: FC<{ error?: string; errorDetails?: string }> = ({
  error,
  errorDetails,
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("text-center text-brand-orange text-xs", !error && "invisible")}>
          <AlertCircleIcon className="inline-block align-text-top text-sm" /> {error}
        </div>
      </TooltipTrigger>
      {!!errorDetails && <TooltipContent>{errorDetails}</TooltipContent>}
    </Tooltip>
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
