import { useMetadataUpdates } from "@ui/hooks/useMetadataUpdates"
import { FC } from "react"

import { SignAlertMessage } from "./SignAlertMessage"

export const MetadataStatus: FC<{ genesisHash?: string; specVersion?: number }> = ({
  genesisHash,
  specVersion,
}) => {
  const { updateUrl, isMetadataUpdating, hasMetadataUpdateFailed, requiresUpdate } =
    useMetadataUpdates(genesisHash, specVersion)

  if (!genesisHash) return null

  if (isMetadataUpdating)
    return (
      <SignAlertMessage processing className="!my-6" type="warning" iconSize="base">
        Updating network metadata, please wait.
      </SignAlertMessage>
    )

  if (hasMetadataUpdateFailed)
    return (
      <SignAlertMessage className="!my-6" type="error">
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

  if (requiresUpdate)
    return (
      <SignAlertMessage className="!my-6" type="error" iconSize="base">
        This network requires a manual metadata update. Please update or your transaction may fail.
      </SignAlertMessage>
    )

  return null
}
