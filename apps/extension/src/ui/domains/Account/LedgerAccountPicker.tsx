import { Balance, BalanceFormatter } from "@core/domains/balances/types"
import { Token } from "@core/domains/tokens/types"
import { Checkbox } from "@talisman/components/Checkbox"
import { Skeleton } from "@talisman/components/Skeleton"
import { CheckCircleIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { convertAddress } from "@talisman/util/convertAddress"
import { api } from "@ui/api"
import { LedgerAccountDefSubstrate } from "@ui/apps/dashboard/routes/AccountAddLedger/context"
import useAccounts from "@ui/hooks/useAccounts"
import useChain from "@ui/hooks/useChain"
import { LedgerStatus, useLedger } from "@ui/hooks/useLedger"
import useToken from "@ui/hooks/useToken"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"

import Fiat from "../Asset/Fiat"
import { Tokens } from "../Asset/Tokens"
import { Address } from "./Address"
import Avatar from "./Avatar"
import { LedgerConnectionStatus } from "./LedgerConnectionStatus"

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;

  .picker-button {
    background: none;
    border: none;
    outline: none;
    padding: 1.6rem;
    background: var(--color-background-muted);
    border-radius: var(--border-radius-tiny);
    max-width: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    text-align: left;
    gap: 1.6rem;
    color: var(--color-foreground-muted);
    :not(:disabled) {
      cursor: pointer;

      :hover {
        background: var(--color-background-muted-3x);
      }
    }
    :disabled {
      opacity: 0.55;
    }

    .vflex {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      line-height: 1.6rem;

      div,
      span {
        font-size: 1.6rem;
        line-height: 1.6rem;
        //width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .caption {
        font-size: 1.4rem;
        line-height: 1.4rem;
        color: var(--color-mid);
      }
    }

    .grow {
      overflow: hidden;
    }

    .right {
      text-align: right;
    }

    input[type="checkbox"] + span span {
      margin-right: 0;
    }
  }
`

const LoadNext = styled.button`
  background: none;
  border: none;
  outline: none;
  padding: 1.6rem;
  border-radius: var(--border-radius-tiny);
  cursor: pointer;
  background: var(--color-background-muted-3x);
  color: var(--color-primary);
  opacity: 0.6;
  :hover {
    opacity: 1;
  }
`

type LedgerAccountInfo = LedgerAccountDefSubstrate & {
  balance: BalanceFormatter
  empty?: boolean
  connected?: boolean
  selected?: boolean
}

const useLedgerChainAccounts = (chainId: string, selectedAccounts: LedgerAccountDefSubstrate[]) => {
  const walletAccounts = useAccounts()
  const chain = useChain(chainId)
  const token = useToken(chain?.nativeToken?.id)

  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccountInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const { isReady, ledger, status, message, requiresManualRetry, refresh } = useLedger(
    chain?.genesisHash
  )

  const loadNextAccount = useCallback(async () => {
    if (!ledger || !chain || !token || !isReady) return

    setLoading(true)
    setError(undefined)

    try {
      // required for formating balances correctly
      const chains = { [chain.id]: chain }
      const tokens = { [token.id]: token }

      const accountIndex = ledgerAccounts.length
      const { address } = await ledger.getAddress(false, accountIndex, 0)
      const balance = new Balance(
        await api.getBalance({
          address,
          chainId: chain.id,
          tokenId: token.id,
        }),
        { chains, tokens }
      )

      if (!balance) throw new Error("Failed to load account balance.")

      const newAccount: LedgerAccountInfo = {
        genesisHash: chain.genesisHash as string,
        accountIndex,
        addressOffset: 0,
        address,
        name: `Ledger ${chain.chainName} ${accountIndex + 1}`,
        balance: balance.total,
        empty: balance.total.planck === BigInt(0),
      }
      setLedgerAccounts((prev) => [...prev, newAccount])
    } catch (err) {
      setError((err as Error).message)
    }
    setLoading(false)
  }, [chain, token, isReady, ledger, ledgerAccounts.length])

  const accounts = useMemo(
    () =>
      ledgerAccounts.map((la) => ({
        ...la,
        connected: walletAccounts?.some(
          (wa) => convertAddress(wa.address, null) === convertAddress(la.address, null)
        ),
        selected: selectedAccounts.some((sa) => sa.address === la.address),
      })),
    [ledgerAccounts, selectedAccounts, walletAccounts]
  )

  useEffect(() => {
    if (error) return
    const lastAccount = accounts[accounts.length - 1]
    if (!lastAccount?.empty || lastAccount?.connected) loadNextAccount()
  }, [error, accounts, loadNextAccount])

  const canLoadMore = useMemo(
    () => !error && ledgerAccounts[ledgerAccounts.length - 1]?.empty && !loading,
    [error, ledgerAccounts, loading]
  )

  return {
    token,
    chain,
    ledger,
    accounts,
    loading,
    error,
    canLoadMore,
    loadNextAccount,
    status,
    message,
    requiresManualRetry,
    refresh,
  }
}

type AccountButtonProps = LedgerAccountInfo & {
  token: Token
  onClick: () => void
}

const ConnectedIcon = styled(CheckCircleIcon)`
  color: var(--color-primary);
  width: 2.4rem;
  height: 2.4rem;
`

const Center = styled.div`
  min-width: 2.4rem;
  text-align: center;
`

const AccountButton: FC<AccountButtonProps> = ({
  token,
  name,
  address,
  balance,
  connected,
  selected,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={classNames("picker-button")}
      disabled={connected}
      onClick={onClick}
    >
      <Avatar address={address} />
      <div className="vflex grow">
        <div>{name}</div>
        <div className="caption">
          <Address address={address} />
        </div>
      </div>
      <div className="vflex right">
        <div>
          <Tokens amount={balance.tokens} symbol={token.symbol} decimals={token.decimals} />
        </div>
        <div className="caption">
          <Fiat amount={balance.fiat("usd")} currency="usd" />
        </div>
      </div>
      <Center>{connected ? <ConnectedIcon /> : <Checkbox checked={selected} disabled />}</Center>
    </button>
  )
}

const AccountButtonShimmer: FC = () => {
  return (
    <button type="button" className={classNames("picker-button")} disabled>
      <Skeleton
        baseColor="#5A5A5A"
        highlightColor="#A5A5A5"
        width={"3.2rem"}
        height={"3.2rem"}
        borderRadius={"50%"}
      />
      <div className="vflex grow">
        <div>
          <Skeleton
            baseColor="#5A5A5A"
            highlightColor="#A5A5A5"
            width={"13rem"}
            height={"1.6rem"}
          />
        </div>
        <div className="caption">
          <Skeleton
            baseColor="#5A5A5A"
            highlightColor="#A5A5A5"
            width={"6.8rem"}
            height={"1.4rem"}
          />
        </div>
      </div>
      <div className="vflex right">
        <div>
          <Skeleton
            baseColor="#5A5A5A"
            highlightColor="#A5A5A5"
            width={"13rem"}
            height={"1.6rem"}
          />
        </div>
        <div className="caption">
          <Skeleton
            baseColor="#5A5A5A"
            highlightColor="#A5A5A5"
            width={"6.8rem"}
            height={"1.4rem"}
          />
        </div>
      </div>
      <Skeleton
        style={{ paddingRight: "0.8rem" }}
        baseColor="#5A5A5A"
        highlightColor="#A5A5A5"
        width={"2rem"}
        height={"1.8rem"}
      />
    </button>
  )
}

type LedgerAccountPickerProps = {
  chainId: string
  defaultAccounts?: LedgerAccountDefSubstrate[]
  onChange?: (accounts: LedgerAccountDefSubstrate[]) => void
}

export const LedgerAccountPicker: FC<LedgerAccountPickerProps> = ({
  chainId,
  defaultAccounts = [],
  onChange,
}) => {
  const [selectedAccounts, setSelectedAccounts] =
    useState<LedgerAccountDefSubstrate[]>(defaultAccounts)
  const {
    token,
    accounts,
    loading,
    error,
    canLoadMore,
    loadNextAccount,
    status,
    message,
    requiresManualRetry,
    refresh,
  } = useLedgerChainAccounts(chainId, selectedAccounts)

  const handleToggleAccount = useCallback(
    (acc: LedgerAccountDefSubstrate) => () => {
      const { genesisHash, address, accountIndex, addressOffset, name } = acc
      setSelectedAccounts((prev) =>
        prev.some((sa) => sa.address === address)
          ? prev.filter((sa) => sa.address !== address)
          : prev.concat({ genesisHash, address, accountIndex, addressOffset, name })
      )
    },
    []
  )

  useEffect(() => {
    if (onChange) onChange(selectedAccounts)
  }, [onChange, selectedAccounts])

  const statusProps = useMemo(() => {
    if (["warning", "error"].includes(status))
      return { status, message, requiresManualRetry, refresh }
    if (error)
      return {
        status: "error" as LedgerStatus,
        message: error,
        requiresManualRetry: false,
        refresh,
      }

    return null
  }, [error, message, refresh, requiresManualRetry, status])

  return (
    <Container>
      {statusProps && <LedgerConnectionStatus {...statusProps} />}
      {accounts.map((account) => (
        <AccountButton
          token={token as Token}
          key={account.address}
          {...account}
          onClick={handleToggleAccount(account)}
        />
      ))}
      {loading && <AccountButtonShimmer />}
      {canLoadMore && <LoadNext onClick={loadNextAccount}>Load next</LoadNext>}
    </Container>
  )
}
