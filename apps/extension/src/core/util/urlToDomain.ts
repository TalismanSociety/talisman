import { Err, Ok, type Result } from "ts-results"

export enum Errors {
  InvalidURL = "Invalid URL",
  UnsupportedProtocol = "URL protocol unsupported",
}

const parseUrl = (urlStr: string): Result<URL, Errors.UnsupportedProtocol | Errors.InvalidURL> => {
  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    return Err(Errors.InvalidURL)
  }

  if (!["http:", "https:", "ipfs:", "ipns:"].includes(url.protocol))
    return Err(Errors.UnsupportedProtocol)

  return Ok(url)
}

export const urlToDomain = (
  urlStr: string
): Result<string, Errors.UnsupportedProtocol | Errors.InvalidURL> => {
  const url = parseUrl(urlStr)
  return url.ok ? Ok(url.val.host) : url
}

/**
 * `scheme://host` — unlike `urlToDomain`, keeps the scheme so http and https on the same host stay
 * distinct. Built by hand because `URL.origin` is `"null"` for non-special schemes (ipfs, ipns).
 * For http(s) pages the result equals the page's `location.origin`.
 */
export const urlToOrigin = (
  urlStr: string
): Result<string, Errors.UnsupportedProtocol | Errors.InvalidURL> => {
  const url = parseUrl(urlStr)
  return url.ok ? Ok(`${url.val.protocol}//${url.val.host}`) : url
}
