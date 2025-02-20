import { IS_EMBEDDED_POPUP } from "./constants"

export const closeIfEmbeddedPopup = () => {
  if (IS_EMBEDDED_POPUP) close()
}
