import { ChevronDownIcon } from "@talismn/icons"
import { Breadcrumb, type BreadcrumbItem } from "@ui/components/Breadcrumb"
import { useSubnetTokens } from "@ui/domains/TaoDashboard/hooks/useSubnetTokens"
import { useNavigateWithQuery } from "@ui/hooks/useNavigateWithQuery"
import { type FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

import { useTaoDashboardSubnetPickerModal } from "./TaoDashboardSubnetPickerModal"

export const TaoDashboardSubnetBreadcrumb: FC<{ netuid: number }> = ({ netuid }) => {
  const { t } = useTranslation()
  const navigate = useNavigateWithQuery()

  const { alphaToken: token } = useSubnetTokens(netuid)
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
              label: (
                <span className="flex items-center gap-4 text-body">
                  <span>
                    {token.subnetName
                      ? `SN${token.netuid} ${token.subnetName}`
                      : t("Subnet {{netuid}}", { netuid })}
                  </span>
                  <span className="text-primary">{token.symbol}</span>
                  <ChevronDownIcon className="text-md" />
                </span>
              ),
              onClick: () => open({ netuid }),
              className: "bg-grey-800 hover:bg-grey-750",
            },
          ]
        : [],
    [navigate, netuid, open, t, token]
  )

  return <Breadcrumb items={items} />
}
