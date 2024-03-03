import { Err, Ok, Result } from "ts-results"

export enum Errors {
  InvalidURL = "Invalid URL",
  UnsupportedProtocol = "URL protocol unsupported",
}

export const urlToDomain = (
  urlStr: string
): Result<string, Errors.UnsupportedProtocol | Errors.InvalidURL> => {
  let url: URL
  try {
    url = new URL(urlStr)
  } catch (error) {
    return Err(Errors.InvalidURL)
  }

  if (!["http:", "https:", "ipfs:", "ipns:"].includes(url.protocol))
    return Err(Errors.UnsupportedProtocol)

  return Ok(url.host)
}
