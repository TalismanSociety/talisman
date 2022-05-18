import { useEffect, useState } from "react"

type BraveNavigator = {
  brave?: {
    isBrave: () => Promise<boolean>
  }
}

const browser = navigator as unknown as BraveNavigator

export const useIsBrave = () => {
  const [isBrave, setIsBrave] = useState(false)

  useEffect(() => {
    try {
      browser.brave?.isBrave().then(setIsBrave)
    } catch (err) {
      // Brave supports this since 2020 and it's ok if it fails on other browsers
      // ==> ignore any error
    }
  }, [])

  return isBrave
}
