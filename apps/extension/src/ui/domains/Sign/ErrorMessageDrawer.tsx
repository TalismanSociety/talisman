import { XCircleIcon } from "@talismn/icons"
import { api } from "@ui/api"
import { CONNECT_LEDGER_DOCS_URL } from "extension-shared"
import { type FC, useEffect, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { Button, Drawer } from "talisman-ui"

export const ErrorMessageDrawer: FC<{
  message: string | undefined
  name?: string // identifies specific errors, some require specific UI
  containerId: string | undefined
  onDismiss: () => void
}> = ({ message, name, containerId, onDismiss }) => {
  const { t } = useTranslation()

  // keep message in memory to prevent flickering on slide out
  const [content, setContent] = useState<string>()

  useEffect(() => {
    if (message) setContent(message)
  }, [message])

  return (
    <Drawer
      anchor="bottom"
      isOpen={!!content && message === content}
      containerId={containerId}
      onDismiss={onDismiss}
    >
      <div className="flex w-full flex-col items-center gap-4 rounded-t-xl bg-grey-800 p-12">
        <XCircleIcon className={"text-[3rem] text-alert-error"} />
        <p className="mt-4 text-body-secondary">
          {name === "GenericAppRequired" ? <LedgerGenericRequired /> : wrapStrong(content)}
        </p>
        {name === "Unauthorized" && (
          <p className="mt-4 text-body-secondary">
            <Trans
              t={t}
              defaults="Please ensure that Ledger is authorized in your browser, using the Check tool in <Link>Talisman settings</Link>"
              components={{
                Link: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <button
                    type="button"
                    onClick={() =>
                      api.dashboardOpen("/settings/general").then(() => {
                        // assuming user authorizes the Ledger from the settings, window still needs to be reopened for it to take effect
                        window.close()
                      })
                    }
                    className="cursor-pointer text-body"
                  ></button>
                ),
              }}
            />
          </p>
        )}
        <Button className="mt-8 w-full" primary onClick={onDismiss}>
          {t("Close")}
        </Button>
      </div>
    </Drawer>
  )
}

const LedgerGenericRequired = () => {
  const { t } = useTranslation()
  return (
    <Trans
      t={t}
      defaults="This network requires a new Ledger app. <br />Use the Polkadot Migration Ledger app to migrate your existing accounts. <DocsLink>Learn more.</DocsLink>"
      components={{
        DocsLink: (
          // eslint-disable-next-line jsx-a11y/anchor-has-content
          <a
            href={CONNECT_LEDGER_DOCS_URL}
            target="_blank"
            className="cursor-pointer text-body"
            rel="noreferrer noopener"
          ></a>
        ),
      }}
    />
  )
}

const wrapStrong = (text?: string) => {
  if (!text) return text

  const splitter = /(<strong>[^<]*?<\/strong>)/g
  const extractor = /^<strong>([^<]*?)<\/strong>$/g

  return text.split(splitter).map((str, i) => {
    const match = extractor.exec(str)
    return match ? (
      <strong key={i} className="p-0 font-bold text-body capitalize">
        {match[1]}
      </strong>
    ) : (
      <span key={i}>{str}</span>
    )
  })
}
