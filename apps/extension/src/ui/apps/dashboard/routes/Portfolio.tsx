import { Balances } from "@core/types"
import { LockIcon } from "@talisman/theme/icons"
import Fiat from "@ui/domains/Asset/Fiat"
import { AssetsTable } from "@ui/domains/Portfolio/AssetsTable"
import { Statistics } from "@ui/domains/Portfolio/Statistics"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useMemo } from "react"
import styled from "styled-components"
import { useDashboard } from "../context"
import Layout from "../layout"

const Header = styled.header`
  display: flex;
  width: 100%;
  gap: 1.6rem;
`

const Flex = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4em;
`

const Main = styled.section`
  margin-top: 3.8rem;
`

const PageContent = ({ balances }: { balances: Balances }) => {
  const { available, locked } = useMemo(() => {
    const { frozen, reserved, transferable } = balances.sum.fiat("usd")
    return {
      available: transferable,
      locked: frozen + reserved,
    }
  }, [balances.sum])

  return (
    <Layout>
      <Header>
        <Statistics title="Available">
          <Fiat amount={available} currency="usd" />
        </Statistics>
        <Statistics
          title={
            <Flex>
              <LockIcon />
              <span>Locked</span>
            </Flex>
          }
        >
          <Fiat amount={locked} currency="usd" />
        </Statistics>
      </Header>
      <Main>
        <AssetsTable balances={balances} />
      </Main>
    </Layout>
  )
}

const SingleAccountAssetsTable = ({ address }: { address: string }) => {
  const balances = useBalancesByAddress(address)

  return <PageContent balances={balances} />
}

const AllAccountsAssetsTable = () => {
  const balances = useBalances()

  return <PageContent balances={balances} />
}

export const Portfolio = () => {
  const { account } = useDashboard()

  return account ? (
    <SingleAccountAssetsTable address={account.address} />
  ) : (
    <AllAccountsAssetsTable />
  )
}
