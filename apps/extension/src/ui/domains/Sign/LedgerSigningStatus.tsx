import { AlertCircleIcon, LoaderIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { CONNECT_LEDGER_DOCS_URL } from "extension-shared"
import { Trans, useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

interface LedgerSigningStatusProps {
  message: string
  requiresConfirmation?: boolean
  status?: "error" | "signing"
  confirm?: () => void
}

const NO_OP = () => {}

export const LedgerSigningStatus = ({
  status,
  message,
  requiresConfirmation = true,
  confirm = NO_OP,
}: LedgerSigningStatusProps) => {
  const { t } = useTranslation("request")

  return (
    <div
      className={
        "bg-grey-800 text-body-secondary flex w-full flex-col items-center gap-4 rounded-t-xl p-12 text-sm"
      }
    >
      {status === "error" && (
        <>
          <AlertCircleIcon
            className={classNames("text-[3rem]", status === "error" && "text-alert-error")}
          />
          <p>
            {message === "GENERIC_APP_REQUIRED" ? (
              <Trans
                t={t}
                defaults="This network requires a new Ledger app. <br />Use the <DocsLink>Polkadot Migration Ledger app to migrate your existing accounts</DocsLink>"
                components={{
                  DocsLink: (
                    // eslint-disable-next-line jsx-a11y/anchor-has-content
                    <a
                      href={CONNECT_LEDGER_DOCS_URL}
                      target="_blank"
                      className="text-body cursor-pointer"
                      rel="noreferrer noopener"
                    ></a>
                  ),
                }}
              />
            ) : (
              message
            )}
          </p>
        </>
      )}
      {status === "signing" && (
        <>
          <LoaderIcon className="animate-spin-slow text-[3rem]" />
          <span>{t("Sign with Ledger...")}</span>
        </>
      )}
      {status === "error" && requiresConfirmation && confirm && (
        <Button className="mt-12 w-full" primary onClick={confirm}>
          {t("OK")}
        </Button>
      )}
    </div>
  )
}
