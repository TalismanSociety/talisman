import { log } from "@common/log"
import { isAccountOwned, isAccountPlatformEthereum } from "@core/domains/keyring/exports"
import type { EthNetworkId, Token } from "@talismn/chaindata-provider"
import { planckToTokens } from "@talismn/util"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@ui/components/Button"
import { Modal } from "@ui/components/Modal"
import { notify } from "@ui/components/Notifications"
import { PopupSizeModalContainer } from "@ui/components/PopupSizeModalContainer"
import { TokensAndFiat } from "@ui/domains/Asset/TokensAndFiat"
import { GenericAmountEdit } from "@ui/domains/Earn/shared/GenericAmountEdit"
import { useEthTransaction } from "@ui/domains/Ethereum/useEthTransaction"
import { usePortfolioNavigation } from "@ui/domains/Portfolio/usePortfolioNavigation"
import { TxSubmitButton } from "@ui/domains/Sign/TxSubmitButton/TxSignButton"
import seekSinglePoolStakingAbi from "@ui/domains/Staking/Seek/seekSinglePoolStakingAbi"
import { useAccountByAddress, useAccounts } from "@ui/state/accounts"
import { useBalances } from "@ui/state/balances"
import { useToken } from "@ui/state/chaindata"
import { useTokenRatesMap } from "@ui/state/tokenRates"
import { cn } from "@ui/util/cn"
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

const ACTION_LABELS: Record<SeekStakingAction, string> = {
  stake: "Stake SEEK",
  requestWithdrawal: "Request Unstake",
  completeWithdrawal: "Complete Unstake",
  getReward: "Claim Rewards",
  cancelWithdrawal: "Cancel Unstake",
}

const isAmountAction = (action: SeekStakingAction) =>
  action === "stake" || action === "requestWithdrawal"

export const SeekStakingModal: FC = () => {
  const { isOpen, close, args } = useSeekStakingModal()

  return (
    <Modal containerId="main" isOpen={isOpen} onDismiss={close}>
      <PopupSizeModalContainer id="seek-staking-modal">
        {args && <SeekStakingForm action={args.action} initialAddress={args.address} />}
      </PopupSizeModalContainer>
    </Modal>
  )
}

const SeekStakingForm: FC<{ action: SeekStakingAction; initialAddress?: string }> = ({
  action,
  initialAddress,
}) => {
  const { t } = useTranslation()
  const { close } = useSeekStakingModal()
  const config = useSeekStakingConfig()
  const token = useToken(config.tokenId)
  const tokenRatesMap = useTokenRatesMap()
  const priceUsd = tokenRatesMap[config.tokenId]?.usd?.price ?? null
  const accounts = useAccounts("owned")
  const balances = useBalances("owned")
  const [address, setAddress] = useState<string | null>(initialAddress ?? null)
  const [amount, setAmount] = useState<bigint | null>(null)
  const queryClient = useQueryClient()

  const accountOptions = useMemo(
    () => accounts.filter((account) => isAccountPlatformEthereum(account)),
    [accounts]
  )
  const { selectedAccounts } = usePortfolioNavigation()
  const selectedEthereumAccountAddresses = useMemo(
    () =>
      selectedAccounts
        .filter((account) => isAccountOwned(account) && isAccountPlatformEthereum(account))
        .map((account) => account.address),
    [selectedAccounts]
  )

  useEffect(() => {
    if (address || !accountOptions.length) return
    setAddress(accountOptions[0].address)
  }, [accountOptions, address])

  const account = useAccountByAddress(address ?? undefined)
  const position = useSeekStakingPosition(address ?? undefined)
  const metadata = useSeekStakingMetadata()
  const allowance = useSeekErc20Allowance(address, action === "stake" ? amount : null)

  const transferable = useMemo(
    () =>
      address && token
        ? (balances.find({ address, tokenId: token.id }).each[0]?.transferable.planck ?? 0n)
        : 0n,
    [address, balances, token]
  )

  const maxAmount = action === "stake" ? transferable : (position.data?.staked ?? 0n)
  const seekTokenAddress = useMemo(
    () => config.tokenId.split(":").at(-1) as `0x${string}`,
    [config.tokenId]
  )

  const handleMaxClick = useCallback(() => setAmount(maxAmount), [maxAmount])

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
      notify({
        title: isApproval ? t("Approval submitted") : t("Transaction submitted"),
        subtitle: hash,
        type: "success",
      })
      if (!isApproval) close()
    },
    [
      address,
      close,
      config.networkId,
      config.stakingContractAddress,
      isApproval,
      queryClient,
      selectedEthereumAccountAddresses,
      t,
    ]
  )

  if (!token) return null

  const submitLabel = isApproval ? t("Approve SEEK") : t(ACTION_LABELS[action])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-24 shrink-0 items-center px-8 font-bold text-lg">
        {t(ACTION_LABELS[action])}
      </div>
      <div className="flex grow flex-col gap-6 overflow-y-auto p-8 pt-0">
        <AccountSelect
          address={address}
          disabled={!!initialAddress}
          accounts={accountOptions}
          onChange={setAddress}
        />
        <SeekPositionSummary
          token={token}
          staked={position.data?.staked ?? 0n}
          earned={position.data?.earned ?? 0n}
          pending={position.data?.pendingWithdrawal.amount ?? 0n}
        />
        {isAmountAction(action) && (
          <div className="h-60 rounded bg-black-secondary p-4">
            <GenericAmountEdit
              value={amount}
              decimals={token.decimals}
              symbol={token.symbol}
              logo={token.logo}
              priceUsd={priceUsd}
              error={error}
              onValueChanged={setAmount}
              onMaxClick={handleMaxClick}
            />
          </div>
        )}
        {action === "completeWithdrawal" && isCompleteLocked && (
          <div className="rounded bg-black-secondary p-6 text-body-secondary text-sm">
            {t("Your unstake is still locked until {{date}}", {
              date: new Date(
                Number(position.data?.pendingWithdrawal.unlockTimestamp ?? 0n) * 1000
              ).toLocaleString(),
            })}
          </div>
        )}
        {ethTx.error && (
          <div className="rounded bg-brand-orange/10 p-4 text-brand-orange text-sm">
            {ethTx.error}
          </div>
        )}
      </div>
      <div className="flex shrink-0 gap-4 border-grey-800 border-t p-8">
        <Button onClick={close} className="w-1/3">
          {t("Cancel")}
        </Button>
        <TxSubmitButton
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
          disabled={!!error || isCompleteLocked || !!ethTx.error}
          isProcessing={ethTx.isLoading || allowance.isLoading}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

const AccountSelect: FC<{
  address: string | null
  disabled?: boolean
  accounts: ReturnType<typeof useAccounts>
  onChange: (address: string) => void
}> = ({ address, disabled, accounts, onChange }) => {
  const { t } = useTranslation()

  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-body-secondary">{t("Account")}</span>
      <select
        disabled={disabled}
        value={address ?? ""}
        className={cn("h-20 rounded bg-black-secondary px-4 text-body", disabled && "opacity-70")}
        onChange={(event) => onChange(event.target.value)}
      >
        {!address && <option value="">{t("Select account")}</option>}
        {accounts.map((account) => (
          <option key={account.address} value={account.address}>
            {account.name ?? account.address}
          </option>
        ))}
      </select>
    </label>
  )
}

const SeekPositionSummary: FC<{
  token: Token
  staked: bigint
  earned: bigint
  pending: bigint
}> = ({ token, staked, earned, pending }) => {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-3 gap-4 rounded bg-black-secondary p-6 text-sm">
      <SummaryValue label={t("Staked")} tokenId={token.id} planck={staked} />
      <SummaryValue label={t("Rewards")} tokenId={token.id} planck={earned} />
      <SummaryValue label={t("Pending")} tokenId={token.id} planck={pending} />
    </div>
  )
}

const SummaryValue: FC<{ label: string; tokenId: string; planck: bigint }> = ({
  label,
  tokenId,
  planck,
}) => (
  <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
    <div className="text-body-secondary">{label}</div>
    <TokensAndFiat tokenId={tokenId} planck={planck.toString()} noFiat tokensClassName="truncate" />
  </div>
)
