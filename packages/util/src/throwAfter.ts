export const throwAfter = (ms: number, reason: string) =>
  new Promise<void>((_, reject) => setTimeout(() => reject(reason), ms))
