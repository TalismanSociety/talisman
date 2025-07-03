import { TalismanHandIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { appStore } from "extension-core"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

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
      <div className="animate-fade-in-slow flex h-[60rem] w-[40rem] flex-col items-center justify-between overflow-hidden p-8">
        <div className="flex h-[26.8rem] flex-col items-center justify-center gap-24 pt-4">
          <TalismanHandIcon
            className={classNames("h-48 w-48", !migration.errors?.length && "animate-pulse")}
          />
          <div className={classNames("text-lg font-bold")}>
            {migration.errors?.length ? t("Talisman update failed") : t("Talisman update")}
          </div>
        </div>
        <div className="flex h-[26.8rem] max-h-[26.8rem] w-full flex-col items-center justify-center gap-12">
          {migration.errors?.length ? (
            <div className="leading-paragraph flex h-full w-full flex-col gap-8">
              <div className="text-body-secondary">
                <Trans
                  t={t}
                  defaults="If you need assistance, contact our help-desk on Discord at <Link />"
                  values={migration}
                  components={{
                    Link: (
                      <a className="text-body underline" href={"https://discord.gg/talisman"}>
                        https://discord.gg/talisman
                      </a>
                    ),
                  }}
                ></Trans>
              </div>
              <ul className="text-alert-warn grow overflow-scroll pl-8">
                {migration.errors.map((err, idx) => (
                  <li key={idx} className="list-disc">
                    {migration.name}: {String(err)}
                  </li>
                ))}
              </ul>
              <Button
                className="shrink-0"
                onClick={() => {
                  appStore.delete("currentMigration")
                }}
              >
                {t("Continue anyway")}
              </Button>
            </div>
          ) : migration.acknowledgeRequest ? (
            <div className="flex grow flex-col">
              <p className="text-body-secondary mt-4 grow text-center text-base">
                {migration.acknowledgeRequest}
              </p>
              <Button
                className="mt-8"
                onClick={() => {
                  appStore.set({ currentMigration: { ...migration, acknowledged: true } })
                }}
              >
                {t("Continue")}
              </Button>
            </div>
          ) : (
            <p className="text-body-secondary mt-4 text-center text-base">
              <span>{t("Progress:")}</span>{" "}
              <span className="tabular-nums">{(100 * (migration.progress ?? 0)).toFixed(0)}%</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
