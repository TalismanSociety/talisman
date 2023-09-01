import { provideContext } from "@talisman/util/provideContext"

import { AccountAddPageProps } from "../types"

const useDcentConnectContext = ({ onSuccess }: AccountAddPageProps) => {
  return { onSuccess }
}

const [DcentConnectProvider, useDcentConnect] = provideContext(useDcentConnectContext)

export { DcentConnectProvider, useDcentConnect }
