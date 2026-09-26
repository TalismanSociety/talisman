export const getErrorMessage = (error: unknown, fallback = "Unknown error"): string => {
  if (typeof error === "string") return error || fallback

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
    return error.message || fallback

  return fallback
}
