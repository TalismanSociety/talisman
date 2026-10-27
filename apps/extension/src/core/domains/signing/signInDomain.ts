import { settingsStore } from "../app/store.settings"
import { isSignInDomainMismatch } from "./helpers"

export const SIGN_IN_DOMAIN_MISMATCH_ERROR =
  "The domain in the sign-in message does not match the requesting site"

export const isSignInDomainRefused = async (
  signInDomain: string | undefined,
  url: string
): Promise<boolean> =>
  signInDomain !== undefined &&
  isSignInDomainMismatch(signInDomain, url) &&
  !(await settingsStore.get("developerMode"))
