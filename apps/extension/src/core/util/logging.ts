/* eslint-disable no-console */
export const consoleOverride = (() => {
  return (debugOn: boolean, suppressKeys: [keyof Console] = ["error"]) => {
    if (!debugOn) {
      // @ts-ignore
      suppressKeys.forEach((key) => (console[key] = () => {}))
    }
  }
})()
