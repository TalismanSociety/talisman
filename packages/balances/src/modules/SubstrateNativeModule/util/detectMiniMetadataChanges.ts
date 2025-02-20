import isEqual from "lodash/isEqual"
import { filter, map, pipe } from "rxjs"

import { MiniMetadata } from "../../../types"

export const detectMiniMetadataChanges = () => {
  let previousMap: Map<string, MiniMetadata> | null = null

  return pipe(
    map<Map<string, MiniMetadata>, Set<string> | null>((currMap) => {
      if (!currMap) return null
      const changes = new Set<string>()

      if (previousMap) {
        // Check for added or changed keys/values
        for (const [key, value] of currMap) {
          if (!previousMap.has(key) || !isEqual(previousMap.get(key), value)) {
            changes.add(value.chainId)
          }
        }

        // Check for removed keys
        for (const [key, value] of previousMap) {
          if (!currMap.has(key)) {
            changes.add(value.chainId)
          }
        }
      }
      previousMap = currMap
      return changes.size > 0 ? changes : null
    }),
    // Filter out null emissions (no changes)
    filter<Set<string> | null, Set<string>>((changes): changes is Set<string> => changes !== null),
  )
}
