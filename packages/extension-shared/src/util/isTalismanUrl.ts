import { isTalismanHostname } from "./isTalismanHostname"

export const isTalismanUrl = (url: string | undefined) => {
  if (!url) return false
  try {
    const hostname = new URL(url).hostname
    return isTalismanHostname(hostname)
  } catch (e) {
    return false
  }
}
