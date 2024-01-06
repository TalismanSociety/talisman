import { useOpenCloseAtom } from "@talisman/hooks/useOpenClose"
import { atom } from "recoil"

const isNavOpenState = atom<boolean>({
  key: "isNavOpenState",
  default: false,
})

export const useNavigationContext = () => {
  return useOpenCloseAtom(isNavOpenState)
}

// export const [NavigationProvider, useNavigationContext] = provideContext(useNavigationProvider)
