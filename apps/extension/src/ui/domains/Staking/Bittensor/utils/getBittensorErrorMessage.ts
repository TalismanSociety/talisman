export const getBittensorErrorMessage = (error: unknown): string | null => {
  if (!error) return null
  if (error instanceof Error) return error.message || null
  if (typeof error === "string") return error || null

  return String(error) || null
}
