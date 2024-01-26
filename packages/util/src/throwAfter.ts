export const throwAfter = (ms: number, reason: string) =>
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error(reason)), ms))
