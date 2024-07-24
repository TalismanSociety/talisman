import { atom, useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect } from "react"
import { useLocation } from "react-router-dom"

import { passwordStore } from "@extension/core"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { atomWithSubscription } from "@ui/atoms/utils/atomWithSubscription"

const dismissAtom = atom(false)

export const shouldMigratePasswordAtom = atomWithSubscription<boolean>((callback) => {
  const sub = passwordStore.observable.subscribe(({ isHashed }) => {
    callback(!isHashed)
  })
  return () => sub.unsubscribe()
})

export const useMigratePasswordModal = () => {
  const location = useLocation()
  const { isOpen, setIsOpen, close } = useOpenClose()
  const shouldMigrate = useAtomValue(shouldMigratePasswordAtom)
  const dismissed = useAtomValue(dismissAtom)

  useEffect(() => {
    setIsOpen(!dismissed && shouldMigrate)
  }, [setIsOpen, shouldMigrate, location, dismissed]) // reset modal when location changes

  return { isOpen, close }
}

export const useDismissMigratePasswordModal = () => {
  const setShouldMigrate = useSetAtom(dismissAtom)

  return useCallback(() => {
    setShouldMigrate(false)
  }, [setShouldMigrate])
}
