/* eslint-disable no-console */
export const consoleOverride = (() => {
  return (debugOn: boolean, suppressKeys: [keyof Console] = ["error"]) => {
    if (!debugOn) {
      // @ts-ignore
      suppressKeys.forEach((key) => (console[key] = () => {}))
    } else if (!process.env.ALLOW_REGISTRY_WARNINGS) {
      const originalWarn = console.warn
      console.warn = (...data: any[]) => {
        if (!data[1]?.includes?.("REGISTRY")) originalWarn(...data)
      }
    }
  }
})()
