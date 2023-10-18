import { EvmNetwork } from "@core/domains/ethereum/types"
import { enabledTokensStore, isTokenEnabled } from "@core/domains/tokens/store.enabledTokens"
import { CustomErc20Token, Erc20Token } from "@core/domains/tokens/types"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { SearchInput } from "@talisman/components/SearchInput"
import { Spacer } from "@talisman/components/Spacer"
import { ChevronRightIcon, PlusIcon } from "@talismn/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { useSetting } from "@ui/hooks/useSettings"
import useTokens from "@ui/hooks/useTokens"
import { useTokensEnabledState } from "@ui/hooks/useTokensEnabledState"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { isErc20Token } from "@ui/util/isErc20Token"
import sortBy from "lodash/sortBy"
import { ChangeEventHandler, FC, useCallback, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useIntersection } from "react-use"
import { ListButton, PillButton, Toggle } from "talisman-ui"

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
  const enabledTokens = useTokensEnabledState()

  const isEnabled = useMemo(() => isTokenEnabled(token, enabledTokens), [token, enabledTokens])

  const handleEnableChanged: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      enabledTokensStore.setEnabled(token.id, e.target.checked)
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
        checked={isEnabled}
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

const NetworkTokensGroup: FC<{ network: EvmNetwork; tokens: Erc20Token[] }> = ({
  network,
  tokens,
}) => {
  return (
    <>
      <div className="flex items-center gap-4 pb-2 pt-8">
        <TokenLogo className="inline text-xl" tokenId={network.nativeToken?.id} />{" "}
        <span>{network.name}</span>
      </div>
      {tokens.map((token) => (
        <TokenRow key={token.id} token={token} />
      ))}
    </>
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

  const [useTestnets] = useSetting("useTestnets")
  const { evmNetworks } = useEvmNetworks(
    useTestnets ? "enabledWithTestnets" : "enabledWithoutTestnets"
  )
  const { tokens } = useTokens("all")
  const erc20Tokens = useMemo(() => sortBy(tokens.filter(isErc20Token), "symbol"), [tokens])
  const [search, setSearch] = useState("")

  const allTokensByNetwork = useMemo(() => {
    if (!evmNetworks || !erc20Tokens) return []

    return sortBy(evmNetworks, "name")
      .map((network) => ({
        network,
        tokens: sortBy(
          erc20Tokens.filter((t) => t.evmNetwork?.id === network.id),
          "symbol"
        ),
      }))
      .filter(({ tokens }) => tokens.length)
  }, [evmNetworks, erc20Tokens])

  const filterTokens = useCallback(
    (tokens: (Erc20Token | CustomErc20Token)[]) => {
      const lowerSearch = search.toLowerCase()
      return tokens.filter((t) =>
        search ? t.symbol.toLowerCase().includes(lowerSearch) : t.isDefault || isCustomErc20Token(t)
      )
    },
    [search]
  )

  const groups = useMemo(() => {
    return allTokensByNetwork
      .map((n) => ({ ...n, tokens: filterTokens(n.tokens) }))
      .filter(({ tokens }) => tokens.length)
  }, [allTokensByNetwork, filterTokens])

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
      <HeaderBlock title={t("Ethereum Tokens")} text={t("Add or delete custom ERC20 tokens")} />
      <Spacer large />
      <div className="flex gap-4">
        <SearchInput onChange={setSearch} placeholder={t("Search tokens")} />
      </div>
      <Spacer small />
      <div className="flex justify-end gap-4">
        <EnableTestnetPillButton className="h-16" />
        <PillButton icon={PlusIcon} size="xs" className="h-16" onClick={handleAddToken}>
          {t("Add token")}
        </PillButton>
      </div>
      <Spacer small />
      <div className="flex flex-col gap-4">
        {groups.map(({ network, tokens }) => (
          <NetworkTokensGroup key={network.id} network={network} tokens={tokens} />
        ))}
      </div>
    </DashboardLayout>
  )
}
