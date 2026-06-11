import type { ScaleApi } from "@talismn/sapi"

type GetBittensorChangeLockHotkeyPayloadProps = {
  sapi: ScaleApi
  address: string
  netuid: number
  /** the hotkey to re-point the existing lock to */
  destinationHotkey: string
}

/**
 * Builds the extrinsic that re-points an EXISTING conviction lock to a different hotkey.
 *
 * `SubtensorModule.move_lock(destination_hotkey, netuid)` moves the caller's lock on a subnet from
 * its current hotkey to `destination_hotkey`. The locked amount and the subnet are unchanged — only
 * the hotkey the lock (and its conviction) is keyed to changes, and it does NOT move the underlying
 * stake or its rewards. The accumulated conviction is preserved only when the origin and destination
 * hotkeys share the same owning coldkey; moving to a hotkey owned by a different coldkey resets the
 * conviction to zero.
 */
export const getBittensorChangeLockHotkeyPayload = ({
  sapi,
  address,
  netuid,
  destinationHotkey,
}: GetBittensorChangeLockHotkeyPayloadProps) => {
  return sapi.getExtrinsicPayload(
    "SubtensorModule",
    "move_lock",
    {
      destination_hotkey: destinationHotkey,
      netuid,
    },
    { address }
  )
}
