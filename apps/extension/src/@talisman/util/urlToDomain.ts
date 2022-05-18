const urlToDomain = (url: string): string => {
  if (
    !url ||
    !(
      url.startsWith("http:") ||
      url.startsWith("https:") ||
      url.startsWith("ipfs:") ||
      url.startsWith("ipns:")
    )
  ) {
    return url
  }

  return url.split("/")[2]
}

export default urlToDomain
