import { subDTaoTokenId } from "@talismn/chaindata-provider"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { Breadcrumb, BreadcrumbItem } from "@talisman/components/Breadcrumb"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { useToken } from "@ui/state"

import { BITTENSOR_NETWORK_ID } from "../constants"
import { useTaoDashboardSubnetPickerModal } from "./TaoDashboardSubnetPickerModal"

export const TaoDashboardSubnetBreadcrumb: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()

  const tokenId = useMemo(() => subDTaoTokenId(BITTENSOR_NETWORK_ID, Number(netuid)), [netuid])
  const token = useToken(tokenId, "substrate-dtao")
  const { open } = useTaoDashboardSubnetPickerModal()

  const items = useMemo(
    (): BreadcrumbItem[] =>
      token
        ? [
            {
              label: t("Earn"),
              onClick: () => navigate("/earn"),
            },
            {
              label: t("All Subnets"),
              onClick: () => navigate("/bittensor/subnets"),
            },
            {
              label: `${token.subnetName} ${token.symbol}` || t("Subnet {{netuid}}", { netuid }),
              onClick: () => open({ netuid }),
            },
          ]
        : [],
    [navigate, netuid, open, t, token],
  )

  return <Breadcrumb items={items} />
}
