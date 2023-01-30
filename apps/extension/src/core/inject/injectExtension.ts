import type { InjectOptions, Injected, InjectedWindow, InjectedWindowProvider } from "./types"

// It is recommended to always use the function below to shield the extension and dapp from
// any future changes. The exposed interface will manage access between the 2 environments,
// be it via window (current), postMessage (under consideration) or any other mechanism
export function injectExtension(
  enable: (origin: string) => Promise<Injected>,
  { name, version, authorised }: InjectOptions
) {
  // small helper with the typescript types, just cast window
  const windowInject = window as Window & InjectedWindow

  // don't clobber the existing object, we will add it (or create as needed)
  windowInject.injectedWeb3 = windowInject.injectedWeb3 || {}

  const injected: InjectedWindowProvider = {
    enable: (origin: string): Promise<Injected> => enable(origin),
    version,
  }
  if (authorised) injected.authorised = authorised

  // add our enable function
  windowInject.injectedWeb3[name] = injected
}
