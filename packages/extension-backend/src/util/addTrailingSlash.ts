export const addTrailingSlash = (url: string) => {
  if (url.endsWith("/")) {
    return url
  }

  return `${url}/`
}
