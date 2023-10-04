import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useCallback, useEffect } from "react"
import { useLocation } from "react-router-dom"
import { atom, useRecoilValue, useSetRecoilState } from "recoil"

/**
 * This hook is used to fix a bug in the migration from the old seed store to the new one.
 * The bug was caused by an older error where the mnemonic was not encrypted with the new, hashed password, but was maintained encrypted by the old
 * plain text password.
 */
export const shouldFixBrokenMigration = atom<boolean>({
  key: "shouldFixBrokenMigration",
  default: false,
  effects: [
    ({ setSelf }) => {
      const hasError = window.localStorage.getItem("mnemonicMigrationError")
      setSelf(hasError === "true")

      const listen = (e: StorageEvent) => {
        if (e.key === "mnemonicMigrationError") {
          setSelf(e.newValue === "true")
        }
      }

      window.addEventListener("storage", listen)
      return () => window.removeEventListener("storage", listen)
    },
  ],
})

export const useFixBrokenMigrationModal = () => {
  const location = useLocation()
  const { isOpen, setIsOpen, close } = useOpenClose()
  const shouldFix = useRecoilValue(shouldFixBrokenMigration)

  useEffect(() => {
    if (shouldFix) setIsOpen(shouldFix)
  }, [setIsOpen, shouldFix, location]) // reset modal when location changes

  return { isOpen, close }
}

export const useDismissFixBrokenMigrationModal = () => {
  const setShouldFix = useSetRecoilState(shouldFixBrokenMigration)

  return useCallback(() => {
    setShouldFix(false)
  }, [setShouldFix])
}
