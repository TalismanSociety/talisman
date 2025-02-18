import { TalismanHandIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useTranslation } from "react-i18next"

import { useAppState } from "@ui/state"
import { IS_POPUP } from "@ui/util/constants"

export const MigrationProgress = () => {
  const { t } = useTranslation()

  const [migration] = useAppState("currentMigration")

  if (!migration) return null

  return (
    <div
      className={classNames(
        // displayed as the only content of the page, while a migration is running.
        !IS_POPUP && "flex h-screen w-screen flex-col items-center justify-center",
      )}
    >
      <div className="animate-fade-in-slow flex h-[60rem] w-[40rem] flex-col items-center overflow-hidden p-8 py-16">
        <div className="flex h-1/2 flex-col items-center justify-center gap-24">
          <TalismanHandIcon className="h-48 w-48 animate-pulse" />
          <div className="text-lg font-bold">{t("Talisman update")}</div>
        </div>
        <div className="flex h-1/2 flex-col items-center justify-center gap-12">
          <p className="text-body-secondary mt-4 text-center text-base">
            {migration.name} -{" "}
            <span className="tabular-nums">{(100 * migration.progress).toFixed(0)}%</span>
          </p>
        </div>
      </div>
    </div>
  )
}
