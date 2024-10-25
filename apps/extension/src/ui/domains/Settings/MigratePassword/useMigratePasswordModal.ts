import { bind } from "@react-rxjs/core"
import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { BehaviorSubject, map } from "rxjs"

import { passwordStore } from "@extension/core"
import { useOpenClose } from "@talisman/hooks/useOpenClose"

const dismiss$ = new BehaviorSubject(false)

export const dismissMigratePasswordModal = () => {
  dismiss$.next(true)
}

const [useDismiss] = bind(dismiss$)

export const [useShouldMigratePassword, shouldMigratePassword$] = bind(
  passwordStore.observable.pipe(map(({ isHashed }) => !isHashed)),
)

export const useMigratePasswordModal = () => {
  const location = useLocation()
  const { isOpen, setIsOpen, close } = useOpenClose()
  const shouldMigrate = useShouldMigratePassword()
  const dismissed = useDismiss()

  useEffect(() => {
    setIsOpen(!dismissed && shouldMigrate)
  }, [setIsOpen, shouldMigrate, location, dismissed]) // reset modal when location changes

  return { isOpen, close }
}
