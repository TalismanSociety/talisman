import { PolkadotConstants } from "@polkadot-api/descriptors"
import { ScaleApi } from "@talismn/sapi"
import { capitalize } from "lodash-es"

export const getConvictionVotingTrackName = (sapi: ScaleApi, trackId: number): string | null => {
  const tracks = sapi.getConstant("Referenda", "Tracks") as PolkadotConstants["Referenda"]["Tracks"]
  const trackName = tracks.find(([id]) => id === trackId)?.[1].name

  if (!trackName) throw new Error("Track not found")

  return trackName
    .replace(/_+/g, " ") // Replace underscores with spaces
    .split(" ")
    .map(capitalize) // Capitalize each word
    .join(" ")
}
