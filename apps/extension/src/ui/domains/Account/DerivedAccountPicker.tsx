import "react-loading-skeleton/dist/skeleton.css"

import { getEthDerivationPath } from "@core/domains/ethereum/helpers"
import {
  AccountAddressType,
  AddressesByChain,
  Balance,
  RequestAccountCreateFromSeed,
} from "@core/types"
import { Checkbox } from "@talisman/components/Checkbox"
import { WithTooltip } from "@talisman/components/Tooltip"
import { CheckCircleIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { convertAddress } from "@talisman/util/convertAddress"
import { api } from "@ui/api"
import useAccounts from "@ui/hooks/useAccounts"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChains from "@ui/hooks/useChains"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import styled from "styled-components"
import { formatDecimals } from "talisman-utils"

import Fiat from "../Asset/Fiat"
import { Address } from "./Address"
import Avatar from "./Avatar"

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
    opacity: 0.2;
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

type AccountButtonProps = DerivedAccountInfo & {
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
    <div></div>
  </button>
)

const AccountButton: FC<AccountButtonProps> = ({
  name,
  address,
  balances,
  connected,
  selected,
  onClick,
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
      <div className="vflex right">
        <WithTooltip as="div" className="caption" tooltip={balanceDetails} noWrap>
          <Fiat amount={totalUsd} currency="usd" />
        </WithTooltip>
      </div>
      <Center>{connected ? <ConnectedIcon /> : <Checkbox checked={selected} disabled />}</Center>
    </button>
  )
}

type DerivedAccountInfo = RequestAccountCreateFromSeed & {
  accountIndex: number
  derivationPath: string
  address: string
  balances: Balance[]
  connected?: boolean
  selected?: boolean
}

const getDerivationPath = (type: AccountAddressType, index: number) => {
  switch (type) {
    case "ethereum":
      return getEthDerivationPath(index)
    default:
      // preserve backwards compatibility : since beta we import mnemonics as-is, without derivationPath
      return index === 0 ? "" : `//${index - 1}`
  }
}

const useDerivedAccounts = (
  name: string,
  mnemonic: string,
  type: AccountAddressType,
  selectedAccounts: RequestAccountCreateFromSeed[],
  pageIndex: number,
  itemsPerPage: number
) => {
  const walletAccounts = useAccounts()
  const [derivedAccounts, setDerivedAccounts] = useState<DerivedAccountInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError(undefined)

    const skip = pageIndex * itemsPerPage

    const newAccounts: DerivedAccountInfo[] = await Promise.all(
      // maps [0, 1, 2, ..., itemsPerPage - 1] dynamically
      Array.from(Array(itemsPerPage).keys()).map(async (i) => {
        const accountIndex = skip + i
        const derivationPath = getDerivationPath(type, accountIndex)
        const seed = mnemonic + derivationPath
        const rawAddress = await api.addressFromMnemonic(mnemonic + derivationPath, type)
        const address = type === "ethereum" ? rawAddress : convertAddress(rawAddress, 0)

        return {
          accountIndex,
          name: `${name}${accountIndex === 0 ? "" : ` ${accountIndex}`}`,
          seed,
          type,
          derivationPath,
          address,
        } as DerivedAccountInfo
      })
    )

    setDerivedAccounts(newAccounts)
    setLoading(false)
  }, [itemsPerPage, mnemonic, name, pageIndex, type])

  const chains = useChains()

  const balanceParams = useMemo(() => {
    const chainIds = type === "ethereum" ? ["moonbeam", "moonriver"] : ["polkadot", "kusama"]
    const testChains = (chains || []).filter((chain) => chainIds.includes(chain.id))

    return testChains.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.id]: derivedAccounts.map((account) => convertAddress(account.address, curr.prefix)),
      }),
      {} as AddressesByChain
    )
  }, [chains, derivedAccounts, type])

  const balances = useBalancesByParams(balanceParams)

  const accounts = useMemo(
    () =>
      derivedAccounts.map((acc) => {
        const existingAccount = walletAccounts?.find(
          (wa) => convertAddress(wa.address, null) === convertAddress(acc.address, null)
        )

        return {
          ...acc,
          name: existingAccount?.name ?? acc.name,
          connected: !!existingAccount,
          selected: selectedAccounts.some((sa) => sa.seed === acc.seed),
          balances: balances.sorted.filter(
            (b) => convertAddress(b.address, null) === convertAddress(acc.address, null)
          ),
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

type DerivedAccountPickerProps = {
  name: string
  mnemonic: string
  type: AccountAddressType
  defaultAccounts?: RequestAccountCreateFromSeed[]
  onChange?: (accounts: RequestAccountCreateFromSeed[]) => void
}

export const DerivedAccountPicker: FC<DerivedAccountPickerProps> = ({
  name,
  mnemonic,
  type,
  defaultAccounts = [],
  onChange,
}) => {
  const itemsPerPage = 5
  const [pageIndex, setPageIndex] = useState(0)
  const [selectedAccounts, setSelectedAccounts] =
    useState<RequestAccountCreateFromSeed[]>(defaultAccounts)
  const { accounts, error, loading } = useDerivedAccounts(
    name,
    mnemonic,
    type,
    selectedAccounts,
    pageIndex,
    itemsPerPage
  )

  const handleToggleAccount = useCallback(
    (acc: DerivedAccountInfo) => () => {
      const { seed } = acc
      setSelectedAccounts((prev) =>
        prev.some((pa) => pa.seed === seed)
          ? prev.filter((pa) => pa.seed !== seed)
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

  return (
    <Container>
      {loading
        ? Array.from(Array(itemsPerPage).keys()).map((i) => <AccountButtonShimmer key={i} />)
        : accounts.map((account) => (
            <AccountButton
              key={account.address}
              {...account}
              onClick={handleToggleAccount(account)}
            />
          ))}
      <Pager>
        {pageIndex > 1 && <PagerButton onClick={handlePageFirst}>&lt;&lt;</PagerButton>}
        {pageIndex > 0 && <PagerButton onClick={handlePagePrev}>&lt;</PagerButton>}
        <PagerButton onClick={handlePageNext}>&gt;</PagerButton>
      </Pager>
      <Error>{error}</Error>
    </Container>
  )
}
