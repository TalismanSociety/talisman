import { EvmNetwork } from "@core/domains/ethereum/types"
import { activeTokensStore, isTokenActive } from "@core/domains/tokens/store.activeTokens"
import { CustomErc20Token, Erc20Token } from "@core/domains/tokens/types"
import { Accordion, AccordionIcon } from "@talisman/components/Accordion"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { SearchInput } from "@talisman/components/SearchInput"
import { Spacer } from "@talisman/components/Spacer"
import { ChevronRightIcon, PlusIcon } from "@talismn/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { useActiveTokensState } from "@ui/hooks/useActiveTokensState"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { isErc20Token } from "@ui/util/isErc20Token"
import sortBy from "lodash/sortBy"
import { ChangeEventHandler, FC, useCallback, useMemo, useRef, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { ListButton, PillButton, Toggle, useOpenClose } from "talisman-ui"

import { DashboardLayout } from "../../layout/DashboardLayout"

const CustomPill = () => {
  const { t } = useTranslation("admin")

  return (
    <div className="bg-primary/10 text-primary inline-block rounded p-4 text-xs font-light">
      {t("Custom")}
    </div>
  )
}

const TokenRow = ({ token }: { token: Erc20Token }) => {
  const navigate = useNavigate()
  const network = useEvmNetwork(token.evmNetwork?.id)
  const activeTokens = useActiveTokensState()

  const isActive = useMemo(() => isTokenActive(token, activeTokens), [token, activeTokens])

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      activeTokensStore.setActive(token.id, e.target.checked)
    },
    [token.id]
  )

  // there are lots of tokens so we should only render visible rows to prevent performance issues
  const refContainer = useRef<HTMLDivElement>(null)
  const intersection = useIntersection(refContainer, {
    root: null,
    rootMargin: "1000px",
  })

  const rowContent = intersection?.isIntersecting ? (
    <>
      <ListButton onClick={() => navigate(`./${token.id}`)}>
        <TokenLogo tokenId={token.id} className="rounded-full text-xl" />
        <div className="flex flex-col !items-start justify-center overflow-hidden">
          <div className="text-body max-w-full truncate">{token.symbol}</div>
          <div className="text-body-secondary truncate text-sm">{network?.name ?? ""}</div>
        </div>
        {isCustomErc20Token(token) && <CustomPill />}
        <div className="min-w-[5rem] shrink-0 grow"></div>
        <ChevronRightIcon className="shrink-0 text-lg transition-none" />
      </ListButton>
      <Toggle
        className="absolute right-20 top-4 p-4"
        checked={isActive}
        onChange={handleEnableChanged}
      />
    </>
  ) : null

  return (
    <div ref={refContainer} className="relative h-28 w-full">
      {rowContent}
    </div>
  )
}

const NetworkTokensGroup: FC<{
  network: EvmNetwork
  tokens: Erc20Token[]
  activeCount: number
  totalCount: number
}> = ({ network, tokens, activeCount, totalCount }) => {
  const { t } = useTranslation("admin")
  const { isOpen, toggle } = useOpenClose()

  return (
    <div className="flex flex-col gap-4">
      <ListButton onClick={toggle}>
        <ChainLogo className="inline text-xl" id={network.id} />{" "}
        <div className="text-md text-body grow truncate">{network.name}</div>
        <div className="text-primary shrink-0">
          {t("{{activeCount}} of {{totalCount}}", { activeCount, totalCount })}
        </div>
        <AccordionIcon className="text-lg" isOpen={isOpen} />
      </ListButton>
      <Accordion isOpen={isOpen}>
        <div className="flex flex-col gap-4 pb-4 pl-12">
          {tokens.map((token) => (
            <TokenRow key={token.id} token={token} />
          ))}
        </div>
      </Accordion>
    </div>
  )
}

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Settings - Tokens",
}

export const TokensPage = () => {
  const { t } = useTranslation("admin")
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()

  const [includeTestnets] = useSetting("useTestnets")
  const { evmNetworks } = useEvmNetworks({ activeOnly: true, includeTestnets })
  const { tokens } = useTokens({ activeOnly: false, includeTestnets: true })
  const erc20Tokens = useMemo(() => sortBy(tokens.filter(isErc20Token), "symbol"), [tokens])
  const [search, setSearch] = useState("")
  const activeTokens = useActiveTokensState()

  const allTokensByNetwork = useMemo(() => {
    if (!evmNetworks || !erc20Tokens) return []

    return sortBy(evmNetworks, "name")
      .map((network) => {
        const tokens = sortBy(
          erc20Tokens.filter((t) => t.evmNetwork?.id === network.id),
          "symbol"
        )
        return {
          network,
          tokens,
          activeCount: tokens.filter((t) => isTokenActive(t, activeTokens)).length,
          totalCount: tokens.length,
        }
      })
      .filter(({ tokens }) => tokens.length)
  }, [evmNetworks, erc20Tokens, activeTokens])

  const filterTokens = useCallback(
    (tokens: (Erc20Token | CustomErc20Token)[]) => {
      if (!search) return tokens

      const lowerSearch = search.toLowerCase()
      return tokens.filter((t) =>
        lowerSearch
          ? t.symbol.toLowerCase().includes(lowerSearch)
          : t.isDefault || isCustomErc20Token(t)
      )
    },
    [search]
  )

  const groups = useMemo(() => {
    return allTokensByNetwork
      .map((n) => ({
        ...n,
        activeCount: n.tokens.filter((t) => isTokenActive(t, activeTokens)).length,
        totalCount: n.tokens.length,
        tokens: filterTokens(n.tokens),
      }))
      .filter(({ tokens }) => tokens.length)
  }, [allTokensByNetwork, activeTokens, filterTokens])

  const handleAddToken = useCallback(() => {
    sendAnalyticsEvent({
      ...ANALYTICS_PAGE,
      name: "Goto",
      action: "Add token button",
    })
    navigate("./add")
  }, [navigate])

  if (!erc20Tokens) return null

  return (
    <DashboardLayout
      analytics={ANALYTICS_PAGE}
      withBack
      centered
      backTo="/settings/networks-tokens"
    >
      <HeaderBlock
        title={t("Ethereum Tokens")}
        text={
          <Trans
            t={t}
            defaults="Enable, add or delete custom ERC20 tokens.<br/>Tokens list is provided by Coingecko."
          />
        }
      />
      <Spacer large />
      <div className="flex gap-4">
        <SearchInput onChange={setSearch} placeholder={t("Search to display more tokens")} />
      </div>
      <Spacer small />
      <div className="flex justify-end gap-4">
        <EnableTestnetPillButton className="h-16" />
        <PillButton icon={PlusIcon} size="xs" className="h-16" onClick={handleAddToken}>
          {t("Add token")}
        </PillButton>
      </div>
      <Spacer small />
      {groups.map(({ network, tokens, activeCount, totalCount }) => (
        <NetworkTokensGroup
          key={network.id}
          network={network}
          tokens={tokens}
          activeCount={activeCount}
          totalCount={totalCount}
        />
      ))}
    </DashboardLayout>
  )
}
