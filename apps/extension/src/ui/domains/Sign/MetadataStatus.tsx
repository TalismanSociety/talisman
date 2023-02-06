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
      <SignAlertMessage processing className="mt-6" type="warning" iconSize="base">
        Updating network metadata, please wait.
      </SignAlertMessage>
    )

  if (showUpdateFailed)
    return (
      <SignAlertMessage className="mt-6" type="error">
        Failed to update metadata. Please update metadata manually
        {updateUrl && (
          <>
            {" "}
            from the{" "}
            <a href={updateUrl} target="_blank" className="text-grey-200 hover:text-white">
              Polkadot.js portal
            </a>
          </>
        )}{" "}
        or your transaction may fail.
      </SignAlertMessage>
    )

  if (showUpdateRequired)
    return (
      <SignAlertMessage className="mt-6" type="error" iconSize="base">
        This network requires a manual metadata update. Please update or your transaction may fail.
      </SignAlertMessage>
    )

  return null
}
