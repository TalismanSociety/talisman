import { Balance } from "@core/domains/balances/types"
import { AccountJson } from "@polkadot/extension-base/background/types"
import { Checkbox } from "@talisman/components/Checkbox"
import { WithTooltip } from "@talisman/components/Tooltip"
import { CheckCircleIcon, LoaderIcon } from "@talisman/theme/icons"
import { classNames } from "@talisman/util/classNames"
import { FC, useCallback, useEffect, useMemo, useState } from "react"
import Skeleton from "react-loading-skeleton"
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

const ConnectedIcon = styled(CheckCircleIcon)`
  color: var(--color-primary);
  width: 2.4rem;
  height: 2.4rem;
`

const Center = styled.div`
  min-width: 2.4rem;
  text-align: center;
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

export type DerivedAccountBase = AccountJson & {
  name: string
  accountIndex: number
  address: string
  balances: Balance[]
  isBalanceLoading: boolean
  connected?: boolean
  selected?: boolean
}

type AccountButtonProps = DerivedAccountBase & {
  onClick: () => void
}

type DerivedAccountPickerBaseProps = {
  accounts: (DerivedAccountBase | null)[]
  onPagerFirstClick?: () => void
  onPagerPrevClick?: () => void
  onPagerNextClick?: () => void
  onAccountClick?: (account: DerivedAccountBase) => void
}

export const DerivedAccountPickerBase: FC<DerivedAccountPickerBaseProps> = ({
  accounts = [],
  onPagerFirstClick,
  onPagerPrevClick,
  onPagerNextClick,
  onAccountClick,
}) => {
  const handleToggleAccount = useCallback(
    (acc: DerivedAccountBase) => () => {
      onAccountClick?.(acc)
    },
    [onAccountClick]
  )

  const isFirstPage = useMemo(() => accounts?.[0]?.accountIndex === 0, [accounts])

  return (
    <Container>
      <div className="flex w-full flex-col gap-4">
        {accounts.map((account, i) =>
          account ? (
            <AccountButton
              key={account.address}
              {...account}
              onClick={handleToggleAccount(account)}
            />
          ) : (
            <AccountButtonShimmer key={i} />
          )
        )}
      </div>
      <Pager>
        {!isFirstPage && <PagerButton onClick={onPagerFirstClick}>&lt;&lt;</PagerButton>}
        {!isFirstPage && <PagerButton onClick={onPagerPrevClick}>&lt;</PagerButton>}
        <PagerButton onClick={onPagerNextClick}>&gt;</PagerButton>
      </Pager>
    </Container>
  )
}
