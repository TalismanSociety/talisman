import { log } from "extension-shared"
import { Dispatch, FC, SetStateAction, Suspense, useEffect, useState } from "react"

import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import { useNetworksMapById, usePortfolio, useTokens } from "@ui/state"

export const TestPage = () => {
  const [showTokens, setShowTokens] = useState(false)
  const [showAllNetworks, setShowAllNetworks] = useState(false)
  const [showDotNetworks, setShowDotNetworks] = useState(false)
  const [showEthNetworks, setShowEthNetworks] = useState(false)

  const [showPortfolio, setShowPortfolio] = useState(false)

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
          {/* <button
            type="button"
            className="rounded border p-2"
            onClick={() => setShowTokens((p) => !p)}
          >
            {showTokens ? "hide tokens" : "show tokens"}
          </button>
          <button
            type="button"
            className="rounded border p-2"
            onClick={() => setShowPortfolio((p) => !p)}
          >
            {showPortfolio ? "hide portfolio" : "show portfolio"}
          </button> */}
        </div>
        <Suspense fallback={<div>Loading...</div>}>
          {showTokens && <TestTokens />}
          {showAllNetworks && <TestAllNetworks />}
          {showEthNetworks && <TestEthNetworks />}
          {showDotNetworks && <TestDotNetworks />}
          {showPortfolio && <TestPortfolio />}
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

const TestPortfolio = () => {
  return (
    <PortfolioContainer>
      <div>
        <div>Test Portfolio Content</div>
        <PortfolioContent />
      </div>
    </PortfolioContainer>
  )
}

const PortfolioContent = () => {
  const { networks } = usePortfolio()

  return <div>Portfolio networks: {networks.length}</div>
}
