import { EvmNetwork } from "@core/domains/ethereum/types"
import { CustomErc20Token, Erc20Token } from "@core/domains/tokens/types"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { IconChevron, PlusIcon } from "@talisman/theme/icons"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import Layout from "@ui/apps/dashboard/layout"
import { AssetLogo } from "@ui/domains/Asset/AssetLogo"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
//import { Erc20Logo } from "@ui/domains/Erc20Tokens/Erc20Logo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCustomErc20Tokens } from "@ui/hooks/useCustomErc20Tokens"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import useTokens from "@ui/hooks/useTokens"
import { isCustomErc20Token } from "@ui/util/isCustomErc20Token"
import { isErc20Token } from "@ui/util/isErc20Token"
import sortBy from "lodash/sortBy"
import { FC, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ListButton, PillButton } from "talisman-ui"

const CustomPill = () => (
  <div className="bg-primary/10 text-primary inline-block rounded p-4 text-sm font-light">
    Custom
  </div>
)

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
      <IconChevron className="text-lg transition-none" />
    </ListButton>
  )
}

type NetworkTokensGroupProps = { network: EvmNetwork; tokens: Erc20Token[] }

const NetworkTokensGroup: FC<NetworkTokensGroupProps> = ({ network, tokens }) => {
  return (
    <>
      <div className="flex items-center gap-4 pt-8 pb-2">
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

export const CustomTokens = () => {
  useAnalyticsPageView(ANALYTICS_PAGE)
  const navigate = useNavigate()

  const allNetworks = useEvmNetworks()
  const allTokens = useTokens()
  const erc20Tokens = useMemo(() => sortBy(allTokens.filter(isErc20Token), "symbol"), [allTokens])

  const groups = useMemo(() => {
    if (!allNetworks || !erc20Tokens) return []

    return sortBy(allNetworks, "name")
      .map((network) => ({
        network,
        tokens: sortBy(
          erc20Tokens.filter((t) => t.evmNetwork?.id === network.id),
          "symbol"
        ),
      }))
      .filter(({ tokens }) => tokens.length)
  }, [allNetworks, erc20Tokens])

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
    <Layout analytics={ANALYTICS_PAGE} withBack centered backTo="/settings">
      <HeaderBlock title="Ethereum Tokens" text="Add or delete custom ERC20 tokens" />
      <div className="mt-16 flex justify-end gap-4">
        <EnableTestnetPillButton className="h-16" />
        <PillButton icon={PlusIcon} size="xs" className="h-16" onClick={handleAddToken}>
          Add token
        </PillButton>
      </div>
      <div className="space-y-4">
        {groups.map(({ network, tokens }) => (
          <NetworkTokensGroup key={network.id} network={network} tokens={tokens} />
        ))}
      </div>
    </Layout>
  )
}
