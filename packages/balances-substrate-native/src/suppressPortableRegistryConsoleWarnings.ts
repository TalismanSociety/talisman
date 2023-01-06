const ignoreModuleMessages: Record<string, string[]> = {
  "PORTABLEREGISTRY:": [
    "Unable to determine runtime Event type, cannot inspect frame_system::EventRecord",
    "Unable to determine runtime Call type, cannot inspect sp_runtime::generic::unchecked_extrinsic::UncheckedExtrinsic",
  ],
}

export function suppressPortableRegistryConsoleWarnings() {
  /* eslint-disable-next-line no-console */
  const originalWarn = console.warn

  /* eslint-disable-next-line no-console */
  console.warn = (...data: any[]) => {
    const [, dataModule, dataMessage] = data
    const ignoreMessages = typeof dataModule === "string" && ignoreModuleMessages[dataModule]
    if (Array.isArray(ignoreMessages) && ignoreMessages.includes(dataMessage)) return

    originalWarn(...data)
  }
}
