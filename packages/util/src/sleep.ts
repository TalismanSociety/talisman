export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    if (process.env.NODE_ENV === "test") resolve()
    else setTimeout(resolve, ms)
  })
