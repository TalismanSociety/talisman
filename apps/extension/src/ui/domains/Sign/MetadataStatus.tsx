import { HexString } from "@polkadot/util/types"
import { useMetadataUpdates } from "@ui/hooks/useMetadataUpdates"
import { FC } from "react"
import { Trans, useTranslation } from "react-i18next"

import { SignAlertMessage } from "./SignAlertMessage"

export const MetadataStatus: FC<{ genesisHash?: HexString; specVersion?: number }> = ({
  genesisHash,
  specVersion,
}) => {
  const { t } = useTranslation("request")
  const { updateUrl, isMetadataUpdating, hasMetadataUpdateFailed, requiresUpdate } =
    useMetadataUpdates(genesisHash, specVersion)

  if (!genesisHash) return null

  if (isMetadataUpdating)
    return (
      <SignAlertMessage processing className="!my-6" type="warning" iconSize="base">
        {t("Updating network metadata, please wait.")}
      </SignAlertMessage>
    )

  if (hasMetadataUpdateFailed)
    return (
      <SignAlertMessage className="!my-6" type="error">
        {updateUrl ? (
          <Trans>
            Failed to update metadata. Please update metadata manually from the{" "}
            <a href={updateUrl} target="_blank" className="text-grey-200 hover:text-white">
              Polkadot.js portal
            </a>{" "}
            or your transaction may fail.
          </Trans>
        ) : (
          t(
            "Failed to update metadata. Please update metadata manually or your transaction may fail."
          )
        )}
      </SignAlertMessage>
    )

  if (requiresUpdate)
    return (
      <SignAlertMessage className="!my-6" type="error" iconSize="base">
        {t(
          "This network requires a manual metadata update. Please update or your transaction may fail."
        )}
      </SignAlertMessage>
    )

  return null
}
