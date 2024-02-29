import { HexString } from "@polkadot/util/types"
import { ExternalLinkIcon } from "@talismn/icons"
import { useMetadataUpdates } from "@ui/hooks/useMetadataUpdates"
import { ReactNode } from "react"
import { Trans, useTranslation } from "react-i18next"

import { SignAlertMessage } from "./SignAlertMessage"

type Props = {
  genesisHash?: HexString
  specVersion?: number
}

export const MetadataStatus = ({ genesisHash, specVersion }: Props) => {
  const { t } = useTranslation("request")
  const { isKnownChain, isMetadataUpdating, hasMetadataUpdateFailed, updateUrl, requiresUpdate } =
    useMetadataUpdates(genesisHash, specVersion)

  if (!genesisHash) return null

  if (isMetadataUpdating)
    return <LoadingAlert>{t("Updating network metadata, please wait.")}</LoadingAlert>

  if (hasMetadataUpdateFailed && updateUrl)
    return (
      <ErrorAlert>
        <Trans>
          Failed to update metadata. Please update metadata manually from the{" "}
          <a
            href={updateUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-grey-200 hover:text-white"
          >
            Polkadot.js portal&nbsp;
            <ExternalLinkIcon className="inline" />
          </a>{" "}
          or your transaction may fail.
        </Trans>
      </ErrorAlert>
    )

  if (hasMetadataUpdateFailed)
    return (
      <ErrorAlert>
        {t(
          "Failed to update metadata. Please update metadata manually or your transaction may fail."
        )}
      </ErrorAlert>
    )

  if (requiresUpdate && !isKnownChain)
    return (
      <ErrorAlert>
        <Trans t={t}>
          Network metadata missing.
          <br />
          Please{" "}
          <a
            href={`${window.location.origin}/dashboard.html#/settings/networks-tokens/networks/polkadot/add`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-grey-200 hover:text-white"
          >
            add this chain to Talisman&nbsp;
            <ExternalLinkIcon className="inline" />
          </a>{" "}
          in order to update the metadata or your transaction may fail.
        </Trans>
      </ErrorAlert>
    )

  if (requiresUpdate)
    return (
      <ErrorAlert>
        {t(
          "This network requires a manual metadata update. Please update or your transaction may fail."
        )}
      </ErrorAlert>
    )

  return null
}

const LoadingAlert = ({ children }: { children: ReactNode }) => (
  <SignAlertMessage className="!my-6" type="warning" iconSize="base" processing>
    {children}
  </SignAlertMessage>
)

const ErrorAlert = ({ children }: { children: ReactNode }) => (
  <SignAlertMessage className="!my-6" type="error" iconSize="base">
    {children}
  </SignAlertMessage>
)
