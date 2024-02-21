import { passwordStore } from "@core/domains/app/store.password"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { atomWithSubscription } from "@ui/atoms/utils/atomWithSubscription"
import { atom, useAtomValue, useSetAtom } from "jotai"
import { useCallback, useEffect } from "react"
import { useLocation } from "react-router-dom"

const dismissAtom = atom(false)

export const shouldMigratePasswordAtom = atomWithSubscription<boolean>((callback) => {
  const { unsubscribe } = passwordStore.observable.subscribe(({ isHashed }) => {
    if (!isHashed) callback(true)
  })
  return unsubscribe
}, "shouldMigratePasswordAtom")

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
