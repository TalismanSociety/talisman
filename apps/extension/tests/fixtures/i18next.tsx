import type { TFunction } from "i18next"
import { Trans } from "react-i18next"

export const TranslationExamples = ({ t }: { t: TFunction }) => (
  <>
    <Trans
      t={t}
      defaults="Protocol: <Protocol />"
      components={{ Protocol: <strong>Ethereum</strong> }}
    />
    <Trans t={t} defaults={"Receiving from an exchange?"} />
    <Trans t={t} i18nKey="Explicit key" defaults="Explicit default" />
    <Trans t={t} values={{ name: "Alice" }}>
      Delete <span>{"{{name}}"}</span>?
    </Trans>
    <Trans t={t}>
      Please
      <br />
      <strong>confirm</strong>&nbsp;now.
    </Trans>
    {t("{{count}} minutes", { count: 2 })}
    {t("Status: Loading...")}
  </>
)
