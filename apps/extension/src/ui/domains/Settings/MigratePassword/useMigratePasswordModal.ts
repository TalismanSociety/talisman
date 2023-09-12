import passwordStore from "@core/domains/app/store.password"
import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { useEffect } from "react"

export const useMigratePasswordModal = () => {
  const { isOpen, setIsOpen, close } = useOpenClose()

  useEffect(() => {
    const sub = passwordStore.observable.subscribe(({ isHashed }) => {
      if (!isHashed) setIsOpen(true)
    })
    return () => {
      sub.unsubscribe()
    }
  }, [setIsOpen])

  return { isOpen, close }
}
