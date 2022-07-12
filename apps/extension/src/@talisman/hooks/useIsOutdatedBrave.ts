import { assert } from "@polkadot/util"
import { useEffect, useState } from "react"

import { useIsBrave } from "./useIsBrave"

export const useIsOutdatedBrave = () => {
  const isBrave = useIsBrave()
  const [requiresUpdating, setRequiresUpdating] = useState(false)

  const CHROMIUM_MINIMUM_VERSION = "99.0.4844.84"

  function compareVersion(v1: string | null, v2: string | null = CHROMIUM_MINIMUM_VERSION) {
    assert(v1 !== null, "Invalid Version number")
    assert(v2 !== null, "Invalid Version number")

    const v1split: string[] = v1.split(".")
    const v2split: string[] = v2.split(".")
    const k = Math.min(v1split.length, v2split.length)
    for (let i = 0; i < k; ++i) {
      const v1num = parseInt(v1split[i], 10)
      const v2num = parseInt(v2split[i], 10)
      if (v1num > v2num) return false
      if (v1num < v2num) return true
    }
    return v1.length === v2.length ? false : v1.length < v2.length ? true : false
  }

  useEffect(() => {
    try {
      // pulls the full version number from userAgent
      const chromeVersion = (/Chrome\/([0-9,.]+)/.exec(navigator.userAgent) || [null])[1]

      // flag the error if the current version is earlier than the nightly build with the fix
      setRequiresUpdating(compareVersion(chromeVersion, CHROMIUM_MINIMUM_VERSION))
    } catch (err) {
      // Brave supports this since 2020 and it's ok if it fails on other browsers
      // ==> ignore any error
    }
  }, [])

  return isBrave && requiresUpdating
}
