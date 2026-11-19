import { CheckCircleIcon, GlobeIcon, UsersIcon } from "@talismn/icons"
import { useMnemonicsAllBackedUp } from "@ui/hooks/useMnemonicsAllBackedUp"
import { usePortfolioAccounts } from "@ui/hooks/usePortfolioAccounts"
import { useNetworks } from "@ui/state/chaindata"
import type { FC, SVGProps } from "react"
import { useTranslation } from "react-i18next"

const Stat: FC<{
  icon: FC<SVGProps<SVGSVGElement>>
  value: string | number
  label: string
  testId: string
}> = ({ icon: Icon, value, label, testId }) => (
  <li className="flex min-w-0 flex-1 items-center gap-3" data-testid={testId}>
    <Icon className="size-8 shrink-0 text-body-secondary" aria-hidden />
    <div className="flex min-w-0 flex-col leading-[1.2]">
      <span className="truncate font-bold text-body text-xs">{value}</span>
      <span className="truncate text-body-secondary text-tiny">{label}</span>
    </div>
  </li>
)

export const AModeStats: FC = () => {
  const { t } = useTranslation()
  const { accounts } = usePortfolioAccounts()
  const networks = useNetworks({ activeOnly: true })
  const allBackedUp = useMnemonicsAllBackedUp()

  return (
    <ul className="flex items-center gap-4 rounded-sm bg-grey-900 px-6 py-4">
      <Stat
        icon={UsersIcon}
        value={accounts.length}
        label={t("Accounts")}
        testId="a-mode-stat-accounts"
      />
      <Stat
        icon={GlobeIcon}
        value={networks.length}
        label={t("Networks")}
        testId="a-mode-stat-networks"
      />
      <Stat
        icon={CheckCircleIcon}
        value={allBackedUp ? t("Backed up") : t("Not backed up")}
        label={t("Recovery phrases")}
        testId="a-mode-stat-backup"
      />
    </ul>
  )
}
