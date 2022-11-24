import HeaderBlock from "@talisman/components/HeaderBlock"
import { IconChevron, PlusIcon } from "@talisman/theme/icons"
import Layout from "@ui/apps/dashboard/layout"
import { TokenLogo } from "@ui/domains/Asset/TokenLogo"
import { EnableTestnetPillButton } from "@ui/domains/Settings/EnableTestnetPillButton"
import { useEvmNetworks } from "@ui/hooks/useEvmNetworks"
import { isCustomEvmNetwork } from "@ui/util/isCustomEvmNetwork"
import sortBy from "lodash/sortBy"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ListButton, PillButton } from "talisman-ui"

const TestnetPill = () => (
  <div className="bg-alert-warn/10 text-alert-warn inline-block rounded p-4 text-sm font-light">
    Testnet
  </div>
)

const CustomPill = () => (
  <div className="bg-primary/10 text-primary inline-block rounded p-4 text-sm font-light">
    Custom
  </div>
)

const NetworksList = () => {
  const navigate = useNavigate()
  const networks = useEvmNetworks()
  const sortedNetworks = useMemo(() => sortBy(networks, "name"), [networks])

  if (!sortedNetworks) return null

  return (
    <div className="flex flex-col gap-4">
      {sortedNetworks.map((network) => (
        <ListButton key={network.id} role="button" onClick={() => navigate(`./${network.id}`)}>
          <TokenLogo className="rounded-full text-xl" tokenId={network?.nativeToken?.id} />
          <div className="text-body grow">{network.name}</div>
          {network.isTestnet && <TestnetPill />}
          {isCustomEvmNetwork(network) && <CustomPill />}
          <IconChevron className="text-lg transition-none" />
        </ListButton>
      ))}
    </div>
  )
}

export const Networks = () => {
  const navigate = useNavigate()

  return (
    <Layout withBack centered backTo="/settings">
      <HeaderBlock title="Ethereum Networks" text="Add or delete custom Ethereum networks" />
      <div className="mt-24 mb-16 flex justify-end gap-4">
        <EnableTestnetPillButton className="h-16" />
        <PillButton size="xs" className="h-16" onClick={() => navigate("./add")}>
          <PlusIcon className="inline" /> Add network
        </PillButton>
      </div>
      <NetworksList />
    </Layout>
  )
}
