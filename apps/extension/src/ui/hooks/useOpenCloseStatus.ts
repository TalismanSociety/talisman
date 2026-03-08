import { provideContext } from "@ui/util/provideContext"

export type OpenCloseStatus = "closed" | "opening" | "open" | "closing"

const useOpenCloseStatusProvider = ({ status }: { status: OpenCloseStatus }) => {
  return status
}

export const [OpenCloseStatusProvider, useOpenCloseStatus] = provideContext(
  useOpenCloseStatusProvider
)
