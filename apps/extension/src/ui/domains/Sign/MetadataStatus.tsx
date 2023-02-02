import { FC } from "react"

import { SignAlertMessage } from "./SignAlertMessage"

type MetadataStatusProps = {
  showUpdating: boolean
  showUpdateRequired: boolean
  showUpdateFailed: boolean
  updateUrl?: string
}

export const MetadataStatus: FC<MetadataStatusProps> = ({
  showUpdating,
  showUpdateRequired,
  showUpdateFailed,
  updateUrl,
}) => {
  if (showUpdating)
    return (
      <SignAlertMessage className="mt-6" type="warning" iconSize="base">
        Updating network metadata, please wait or try again.
      </SignAlertMessage>
    )

  if (showUpdateRequired)
    return (
      <SignAlertMessage className="mt-6" type="error" iconSize="base">
        This network requires a manual metadata update. Please update and try again.
      </SignAlertMessage>
    )

  if (showUpdateFailed)
    return (
      <SignAlertMessage className="mt-6" type="error">
        Metadata update required. Please update metadata from the
        {updateUrl && (
          <>
            {" "}
            <a href={updateUrl} target="_blank">
              Polkadot.js portal
            </a>
          </>
        )}{" "}
        and try again.
      </SignAlertMessage>
    )

  return null
}
