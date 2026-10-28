import { settingsStore } from "../app/store.settings"
import { isSignInDomainMismatch } from "./helpers"

export const SIGN_IN_DOMAIN_MISMATCH_ERROR =
  "The domain in the sign-in message does not match the requesting site"

export const isSignInDomainRefused = async (text: string, url: string): Promise<boolean> =>
  isSignInDomainMismatch(text, url) && !(await settingsStore.get("developerMode"))
