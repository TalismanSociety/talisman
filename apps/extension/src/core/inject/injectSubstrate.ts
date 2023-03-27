import { log } from "@core/log"
import { SendRequest } from "@core/types"

type TalismanWindow = Window &
  typeof globalThis & {
    talismanSub?: any
  }

export const injectSubstrate = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  log.debug("Injecting talismanSub")
  windowInject.talismanSub = { sendRequest }
}
