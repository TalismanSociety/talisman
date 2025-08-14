import { PublicKey } from "@solana/web3.js"
import { log } from "extension-shared"
import { groupBy } from "lodash-es"
import { Dispatch, FC, SetStateAction, Suspense, useEffect, useMemo, useState } from "react"

import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { useNetworksMapById, usePortfolioGlobalData, useTokens } from "@ui/state"
import { useDefiPositions } from "@ui/state/defi"
import { useSolanaConnection } from "@ui/util/solana/useSolanaConnection"

// At time time used to test the observables & hooks from ./ui/state, how often they suspense and emit
// But can be used to test virtually anything in the app
export const TestPage = () => {
  const [showTokens, setShowTokens] = useState(false)
  const [showAllNetworks, setShowAllNetworks] = useState(false)
  const [showDotNetworks, setShowDotNetworks] = useState(false)
  const [showEthNetworks, setShowEthNetworks] = useState(false)
  const [showPortfolio, setShowPortfolio] = useState(false)
  const [showDefi, setShowDefi] = useState(false)
  const [showSolanaBalance, setShowSolanaBalance] = useState(false)

  return (
    <div className="container mx-auto my-12">
      <div className="flex flex-col items-start gap-4">
        <div>Test component</div>
        <div className="flex flex-wrap gap-4">
          <ToggleButton label="all tokens" show={showTokens} dispatch={setShowTokens} />
          <ToggleButton label="all networks" show={showAllNetworks} dispatch={setShowAllNetworks} />
          <ToggleButton label="eth networks" show={showEthNetworks} dispatch={setShowEthNetworks} />
          <ToggleButton label="dot networks" show={showDotNetworks} dispatch={setShowDotNetworks} />
          <ToggleButton label="portfolio" show={showPortfolio} dispatch={setShowPortfolio} />
          <ToggleButton label="defi" show={showDefi} dispatch={setShowDefi} />
          <ToggleButton
            label="sol balance"
            show={showSolanaBalance}
            dispatch={setShowSolanaBalance}
          />
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          {showTokens && <TestTokens />}
          {showAllNetworks && <TestAllNetworks />}
          {showEthNetworks && <TestEthNetworks />}
          {showDotNetworks && <TestDotNetworks />}
          {showPortfolio && <TestPortfolio />}
          {showDefi && <TestDefi />}
          {showSolanaBalance && <TestSolanaBalance />}
        </Suspense>
      </div>
    </div>
  )
}

const ToggleButton: FC<{
  label: string
  show: boolean
  dispatch: Dispatch<SetStateAction<boolean>>
}> = ({ label, show, dispatch }) => (
  <button
    type="button"
    className="rounded border p-2"
    onClick={() => dispatch((p) => !p)}
  >{`${show ? "hide" : "show"} ${label}`}</button>
)

const TestTokens = () => {
  const tokens = useTokens({ activeOnly: false, includeTestnets: false })

  useEffect(() => {
    log.log("Tokens changed", tokens.length)
  }, [tokens])

  return <div>Tokens: {tokens.length}</div>
}

const TestAllNetworks = () => {
  const networks = useNetworksMapById()

  useEffect(() => {
    log.log("All Networks changed", Object.keys(networks).length)
  }, [networks])

  return (
    <div>
      <div>All Networks: {Object.keys(networks).length}</div>
    </div>
  )
}
const TestDotNetworks = () => {
  const networks = useNetworksMapById({ platform: "polkadot" })

  useEffect(() => {
    log.log("Dot Networks changed", Object.keys(networks).length)
  }, [networks])

  return (
    <div>
      <div>Dot Networks: {Object.keys(networks).length}</div>
    </div>
  )
}
const TestEthNetworks = () => {
  const networks = useNetworksMapById({ platform: "ethereum" })

  useEffect(() => {
    log.log("Eth Networks changed", Object.keys(networks).length)
  }, [networks])

  return (
    <div>
      <div>Eth Networks: {Object.keys(networks).length}</div>
    </div>
  )
}

const TestSolanaBalance = () => {
  const connection = useSolanaConnection("solana-mainnet")
  const [balance, setBalance] = useState("")

  useEffect(() => {
    if (!connection) return
    // Example of fetching a balance, replace with actual logic
    connection
      .getBalance(new PublicKey("5xJvx7YrqCqgyzxx4PQXt1AVbxioUsGABf2zevmYC8UL"))
      .then((bal) => {
        setBalance(bal.toString())
        log.log("Fetched Solana balance:", bal)
      })
      .catch((error) => {
        log.error("Error fetching Solana balance:", error)
      })
  }, [connection])

  // Placeholder for Solana balance test
  // This would typically involve fetching balances using a Solana connector
  return <div>Solana Balance: {balance}</div>
}

const TestDefi = () => {
  const defiPositions = useDefiPositions()

  log.log("[DeFi] positions", { defiPositions })

  return (
    <div>
      <div>Test Defi</div>
      <div>Loading status: {defiPositions.status}</div>
      <div>Positions: {defiPositions.data?.length ?? "[empty]"}</div>
      {!!defiPositions.error && <div>Error: {defiPositions.error.message}</div>}
    </div>
  )
}
const TestPortfolio = () => (
  <PortfolioContainer>
    <div>
      <div>Test Portfolio Content</div>
      <PortfolioContent />
    </div>
  </PortfolioContainer>
)

const PortfolioContent = () => {
  const { allBalances, networks, isProvisioned, isInitialising } = usePortfolioGlobalData()

  const balancesByStatus = useMemo(() => groupBy(allBalances.each, (b) => b.status), [allBalances])

  const balancesByType = useMemo(
    () => groupBy(allBalances.each, (b) => b.token?.type),
    [allBalances],
  )

  return (
    <div className="tabular-nums">
      <div>IsInitializing: {isInitialising?.toString() || "undefined"}</div>
      <div>isProvisioned: {isProvisioned?.toString() || "undefined"}</div>
      <div>Portfolio networks: {networks.length}</div>
      <div className="flex gap-4">
        <div className="w-[100px]">Balances:</div>
        <div className="w-[100px]">total:{allBalances.count}</div>
        {Object.entries(balancesByStatus).map(([status, balances]) => (
          <div key={status} className="w-[100px]">
            {status}: {balances.length}
          </div>
        ))}
      </div>
      <div className="">
        <div>Balances by type:</div>
        {Object.entries(balancesByType).map(([type, balances]) => (
          <div key={type}>
            {type}: {balances.length}
          </div>
        ))}
      </div>
    </div>
  )
}
