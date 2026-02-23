import { bind } from "@react-rxjs/core"
import { useEffect } from "react"
import { BehaviorSubject } from "rxjs"

const socialFeedsMounted$ = new BehaviorSubject(false)

/** Returns `true` while the social feeds tab is mounted. */
export const [useSocialFeedsMounted] = bind(socialFeedsMounted$)

/** Call this hook inside the social feeds tab component to signal mount/unmount. */
export const useSocialFeedsMountSignal = () => {
  useEffect(() => {
    socialFeedsMounted$.next(true)
    return () => {
      socialFeedsMounted$.next(false)
    }
  }, [])
}
