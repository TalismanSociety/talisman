import passwordStore from "@core/domains/app/store.password"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useCallback, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { atom, useRecoilValue, useSetRecoilState } from "recoil"

export const shouldMigratePasswordState = atom<boolean>({
  key: "shouldMigratePasswordState",
  default: false,
  effects: [
    ({ setSelf }) => {
      const sub = passwordStore.observable.subscribe(({ isHashed }) => {
        if (!isHashed) setSelf(true)
      })
      return () => {
        sub.unsubscribe()
      }
    },
  ],
})

export const useMigratePasswordModal = () => {
  const location = useLocation()
  const { isOpen, setIsOpen, close } = useOpenClose()
  const shouldMigrate = useRecoilValue(shouldMigratePasswordState)

  useEffect(() => {
    setIsOpen(shouldMigrate)
  }, [setIsOpen, shouldMigrate, location]) // reset modal when location changes

  return { isOpen, close }
}

export const useDismissMigratePasswordModal = () => {
  const setShouldMigrate = useSetRecoilState(shouldMigratePasswordState)

  return useCallback(() => {
    setShouldMigrate(false)
  }, [setShouldMigrate])
}
