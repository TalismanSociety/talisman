import { EvmNetwork } from "@core/domains/ethereum/types"
import { Erc20Token } from "@core/domains/tokens/types"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
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
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { isErc20Token } from "@ui/util/isErc20Token"
import sortBy from "lodash/sortBy"
import { FC, useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { ListButton, PillButton } from "talisman-ui"

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

  return (
    <ListButton onClick={() => navigate(`./${token.id}`)}>
      <TokenLogo tokenId={token.id} className="rounded-full text-xl" />
      <div className="flex grow flex-col !items-start justify-center">
        {network && (
          <>
            <div className="text-body">{token.symbol}</div>
            <div className="text-body-secondary text-sm">{network?.name ?? ""}</div>
          </>
        )}
      </div>
      {isCustomErc20Token(token) && <CustomPill />}
      <ChevronRightIcon className="text-lg transition-none" />
    </ListButton>
  )
}

type NetworkTokensGroupProps = { network: EvmNetwork; tokens: Erc20Token[] }

const NetworkTokensGroup: FC<NetworkTokensGroupProps> = ({ network, tokens }) => {
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
  const { tokens } = useTokens(useTestnets)
  const erc20Tokens = useMemo(() => sortBy(tokens.filter(isErc20Token), "symbol"), [tokens])

  const groups = useMemo(() => {
    if (!evmNetworks || !erc20Tokens) return []

    return sortBy(evmNetworks, "name")
      .map((network) => ({
        network,
        tokens: sortBy(
          erc20Tokens.filter((t) => t.evmNetwork?.id === network.id && t.isDefault),
          "symbol"
        ),
      }))
      .filter(({ tokens }) => tokens.length)
  }, [evmNetworks, erc20Tokens])

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
