import { appStore } from "@core/domains/app/store.app"
import { TalismanHandIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { useAppState } from "@ui/state/app"
import { Button } from "@ui/talisman-ui/components/Button"
import { IS_POPUP } from "@ui/util/constants"
import { Trans, useTranslation } from "react-i18next"

export const MigrationProgress = () => {
  const { t } = useTranslation()

  const [migration] = useAppState("currentMigration")
  if (!migration) return null

  return (
    <div
      className={classNames(
        // displayed as the only content of the page, while a migration is running.
        !IS_POPUP && "flex h-screen w-screen flex-col items-center justify-center"
      )}
    >
      <div className="flex h-[60rem] w-[40rem] animate-fade-in-slow flex-col items-center justify-between overflow-hidden p-8">
        <div className="flex h-[26.8rem] flex-col items-center justify-center gap-24 pt-4">
          <TalismanHandIcon
            className={classNames("h-48 w-48", !migration.errors?.length && "animate-pulse")}
          />
          <div className={classNames("font-bold text-lg")}>
            {migration.errors?.length ? t("Talisman update failed") : t("Talisman update")}
          </div>
        </div>
        <div className="flex h-[26.8rem] max-h-[26.8rem] w-full flex-col items-center justify-center gap-12">
          {migration.errors?.length ? (
            <div className="flex h-full w-full flex-col gap-8 leading-paragraph">
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
              <ul className="grow overflow-scroll pl-8 text-alert-warn">
                {migration.errors.map((err, idx) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: legacy
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
              <p className="mt-4 grow text-center text-base text-body-secondary">
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
            <p className="mt-4 text-center text-base text-body-secondary">
              <span>{t("Progress:")}</span>{" "}
              <span className="tabular-nums">{(100 * (migration.progress ?? 0)).toFixed(0)}%</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
