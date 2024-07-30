import { FC, useCallback, useEffect, useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { Tabs } from "@talisman/components/Tabs"

import { useSelectedAccount } from "./useSelectedAccount"

const URL_TAB_TOKENS = "/portfolio/tokens"
const URL_TAB_NFTS = "/portfolio/nfts"

export const PortfolioTabs: FC<{ className?: string }> = ({ className }) => {
  const { account, accounts } = useSelectedAccount()
  const location = useLocation()
  const navigate = useNavigate()

  const withNfts = useMemo(() => {
    return account
      ? account.type === "ethereum"
      : accounts.some((account) => account.type === "ethereum")
  }, [account, accounts])

  const tabs = useMemo(() => {
    const resTabs = [{ label: "Tokens", value: URL_TAB_TOKENS }]
    if (withNfts) resTabs.push({ label: "NFTs", value: URL_TAB_NFTS }) // , disabled: !withNfts

    return resTabs
  }, [withNfts])

  // if no NFT tab available, if user is at NFT url, redirect out of it
  // ex: user browses nfts of an evm account, then switches to a substrate account
  useEffect(() => {
    if (!withNfts && location.pathname.startsWith(URL_TAB_NFTS)) navigate(URL_TAB_TOKENS)
  }, [location.pathname, navigate, withNfts])

  const selected = useMemo(
    () => tabs.find((tab) => location.pathname.startsWith(tab.value)),
    [location.pathname, tabs]
  )

  const handleChange = useCallback(
    (value: string) => {
      navigate(`${value}${location.search}`)
    },
    [location.search, navigate]
  )

  return (
    <Tabs tabs={tabs} selected={selected?.value} onChange={handleChange} className={className} />
  )
}
