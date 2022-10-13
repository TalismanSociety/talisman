import { AddressesByEvmNetwork, Balance } from "@core/domains/balances/types"
import {
  getEthLedgerDerivationPath,
  LedgerEthDerivationPathType,
} from "@core/domains/ethereum/helpers"
import { AddressesByChain } from "@core/types/base"
import { Checkbox } from "@talisman/components/Checkbox"
import { WithTooltip } from "@talisman/components/Tooltip"
import { CheckCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { convertAddress } from "@talisman/util/convertAddress"
import { api } from "@ui/api"
import { LedgerAccountDefEthereum } from "@ui/apps/dashboard/routes/AccountAddLedger/context"
import useAccounts from "@ui/hooks/useAccounts"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChains from "@ui/hooks/useChains"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useLedgerEthereum } from "@ui/hooks/useLedgerEthereum"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import Skeleton from "react-loading-skeleton"
import styled from "styled-components"
import { formatDecimals } from "talisman-utils"

import Fiat from "../Asset/Fiat"
import { Address } from "./Address"
import Avatar from "./Avatar"

const BALANCE_CHECK_EVM_NETWORK_IDS = [1284, 1285, 592, 1]

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;

  .picker-button {
    width: 100%;
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
    opacity: 0.55;
    transition: opacity var(--transition-speed-slow) ease-in-out;
    color: var(--color-foreground-muted);

    :not(:disabled) {
      cursor: pointer;

      :hover {
        background: var(--color-background-muted-3x);
      }
    }
    &.appear {
      opacity: 1;
    }
    &.appear:disabled {
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

    &.shim div {
      height: 3.6rem;
    }
  }
`

const PagerButton = styled.button.attrs({ type: "button" })`
  background: none;
  border: none;
  outline: none;
  padding: 0.8rem;
  width: 4rem;
  border-radius: var(--border-radius-tiny);
  cursor: pointer;
  font-weight: var(--font-weight-bold);

  background: var(--color-background-muted-3x);
  color: var(--color-mid);
  opacity: 0.6;
  :hover {
    opacity: 1;
  }
`

type AccountButtonProps = LedgerEthereumAccountInfo & {
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

const Error = styled.p`
  color: var(--color-status-error);
`

const Pager = styled.div`
  display: flex;
  width: 100%;
  justify-content: flex-end;
  gap: 1.2rem;
`

const AccountButtonShimmer = () => (
  <button type="button" className={classNames("picker-button", "shim")} disabled>
    <Skeleton
      baseColor="#5A5A5A"
      highlightColor="#A5A5A5"
      width={"3.2rem"}
      height={"3.2rem"}
      borderRadius={"50%"}
    />
    <div className="vflex grow">
      <div>
        <Skeleton baseColor="#5A5A5A" highlightColor="#A5A5A5" width={"13rem"} height={"1.6rem"} />
      </div>
      <div className="caption">
        <Skeleton baseColor="#5A5A5A" highlightColor="#A5A5A5" width={"6.8rem"} height={"1.4rem"} />
      </div>
    </div>
    <div className="caption flex flex-col justify-center ">
      <Skeleton baseColor="#5A5A5A" highlightColor="#A5A5A5" width={"6.8rem"} height={"1.8rem"} />
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

const AccountButton: FC<AccountButtonProps> = ({
  name,
  address,
  balances,
  connected,
  selected,
  onClick,
  isBalanceLoading,
}) => {
  const [appear, setAppear] = useState(false)
  useEffect(() => {
    const timeout = setTimeout(() => setAppear(true), 10)
    return () => clearTimeout(timeout)
  }, [])

  const { balanceDetails, totalUsd } = useMemo(() => {
    const balanceDetails = balances
      .filter((b) => b.total.planck > BigInt("0") && b.total.fiat("usd"))
      .map(
        (b) =>
          `${formatDecimals(b.total.tokens)} ${b.token?.symbol} / ${new Intl.NumberFormat(
            undefined,
            {
              style: "currency",
              currency: "usd",
              currencyDisplay: "narrowSymbol",
            }
          ).format(b.total.fiat("usd") ?? 0)}`
      )
      .join("\n")
    const totalUsd = balances.reduce(
      (prev, curr) => prev + (curr.total ? curr.total.fiat("usd") ?? 0 : 0),
      0
    )

    return { balanceDetails, totalUsd }
  }, [balances])

  return (
    <button
      type="button"
      className={classNames("picker-button", appear && "appear")}
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
      <div className="flex items-center justify-end gap-2">
        <div className="flex flex-col justify-center pb-1 leading-none">
          {isBalanceLoading && <LoaderIcon className="animate-spin-slow inline text-white" />}
        </div>
        <WithTooltip as="div" className="leading-none" tooltip={balanceDetails} noWrap>
          <Fiat className="leading-none" amount={totalUsd} currency="usd" />
        </WithTooltip>
      </div>
      <Center>{connected ? <ConnectedIcon /> : <Checkbox checked={selected} disabled />}</Center>
    </button>
  )
}

type LedgerEthereumAccountInfo = LedgerAccountDefEthereum & {
  accountIndex: number
  path: string
  address: string
  balances: Balance[]
  isBalanceLoading: boolean
  connected?: boolean
  selected?: boolean
}

const useLedgerEthereumAccounts = (
  name: string,
  derivationPathType: LedgerEthDerivationPathType,
  selectedAccounts: LedgerAccountDefEthereum[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<(LedgerEthereumAccountInfo | undefined)[]>(
    [...Array(itemsPerPage)]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const { isReady, ledger } = useLedgerEthereum()

  const loadPage = useCallback(async () => {
    if (!ledger || !isReady) return

    setLoading(true)
    setError(undefined)

    const skip = pageIndex * itemsPerPage

    try {
      const newAccounts: (LedgerEthereumAccountInfo | undefined)[] = [...Array(itemsPerPage)]

      for (let i = 0; i < itemsPerPage; i++) {
        const accountIndex = skip + i
        const path = getEthLedgerDerivationPath(derivationPathType, accountIndex)

        const { address } = await ledger.getAddress(path)

        newAccounts[i] = {
          accountIndex,
          name: `${name}${accountIndex + 1}`,
          path,
          address,
        } as LedgerEthereumAccountInfo

        setDerivedAccounts((prev) => [...newAccounts])
      }
    } catch (err) {
      setError((err as Error).message)
    }

    setLoading(false)
  }, [derivationPathType, isReady, itemsPerPage, ledger, name, pageIndex])

  const evmNetworks = useEvmNetworks()

  const balanceParams: AddressesByEvmNetwork = useMemo(() => {
    const evmNetworkIds = [1284, 1285, 592, 1]

    const result = {
      addresses: derivedAccounts
        .filter((acc) => !!acc)
        .map((acc) => acc?.address)
        .filter(Boolean) as string[],
      evmNetworks: (evmNetworks || [])
        .filter((chain) => evmNetworkIds.includes(Number(chain.id)))
        .map(({ id, nativeToken }) => ({ id, nativeToken: { id: nativeToken?.id as string } })),
    }

    return result
  }, [derivedAccounts, evmNetworks])

  const balances = useBalancesByParams({}, balanceParams)

  const accounts = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        if (!acc) return null

        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === convertAddress(acc.address, null)
        )

        const accountBalances = balances.sorted.filter(
          (b) => convertAddress(b.address, null) === convertAddress(acc.address, null)
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.path === acc.path),
          balances: accountBalances,
          isBalanceLoading:
            accountBalances.length < BALANCE_CHECK_EVM_NETWORK_IDS.length ||
            accountBalances.some((b) => b.status !== "live"),
        }
      }),
    [balances.sorted, derivedAccounts, selectedAccounts, walletAccounts]
  )

  useEffect(() => {
    // refresh on every page change
    loadPage()
  }, [loadPage])

  return {
    accounts,
    loading,
    error,
  }
}

type LedgerEthereumAccountPickerProps = {
  name: string
  derivationPathType: LedgerEthDerivationPathType
  defaultAccounts?: LedgerAccountDefEthereum[]
  onChange?: (accounts: LedgerAccountDefEthereum[]) => void
}

export const LedgerEthereumAccountPicker2: FC<LedgerEthereumAccountPickerProps> = ({
  name,
  derivationPathType,
  defaultAccounts = [],
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] =
    useState<LedgerAccountDefEthereum[]>(defaultAccounts)
  const { accounts, error, loading } = useLedgerEthereumAccounts(
    name,
    derivationPathType,
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback(
    (acc: LedgerEthereumAccountInfo) => () => {
      const { path } = acc
      setSelectedAccounts((prev) =>
        prev.some((pa) => pa.path === path)
          ? prev.filter((pa) => pa.path !== path)
          : prev.concat(acc)
      )
    },
    []
  )

  useEffect(() => {
    if (onChange) onChange(selectedAccounts)
  }, [onChange, selectedAccounts])

  const handlePageFirst = useCallback(() => setPageIndex(0), [])
  const handlePagePrev = useCallback(() => setPageIndex((prev) => prev - 1), [])
  const handlePageNext = useCallback(() => setPageIndex((prev) => prev + 1), [])
  //loading ||
  return (
    <Container>
      <div className="flex w-full flex-col gap-4">
        {
          // true
          // ? Array.from(Array(itemsPerPage).keys()).map((i) => <AccountButtonShimmer key={i} />)
          // :
          accounts.map((account, i) =>
            account ? (
              <AccountButton
                key={account.address}
                {...account}
                onClick={handleToggleAccount(account)}
              />
            ) : (
              <AccountButtonShimmer key={i} />
            )
          )
        }
      </div>
      <Pager>
        {pageIndex > 1 && <PagerButton onClick={handlePageFirst}>&lt;&lt;</PagerButton>}
        {pageIndex > 0 && <PagerButton onClick={handlePagePrev}>&lt;</PagerButton>}
        <PagerButton onClick={handlePageNext}>&gt;</PagerButton>
      </Pager>
      <Error>{error}</Error>
    </Container>
  )
}
