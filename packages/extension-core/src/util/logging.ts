/* eslint-disable no-console */
export const consoleOverride = (() => {
  return (debugOn: boolean, suppressKeys: [keyof Console] = ["error"]) => {
    if (!debugOn) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      suppressKeys.forEach((key) => (console[key] = () => {}))
    }
  }
})()
