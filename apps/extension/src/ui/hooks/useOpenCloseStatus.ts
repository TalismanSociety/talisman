import { provideContext } from "@talisman/util/provideContext"

export type OpenCloseStatus = "closed" | "opening" | "open" | "closing"

export const useOpenCloseStatusProvider = ({ status }: { status: OpenCloseStatus }) => {
  return status
}

export const [OpenCloseStatusProvider, useOpenCloseStatus] = provideContext(
  useOpenCloseStatusProvider
)
