export const IS_POPUP = typeof window !== "undefined" && window.location.pathname === "/popup.html"

export const IS_EMBEDDED_POPUP =
  IS_POPUP && new URLSearchParams(window.location.search).has("embedded")
