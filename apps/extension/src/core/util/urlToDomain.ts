import { Err, Ok, Result } from "ts-results"

export const urlToDomain = (
  urlStr: string
): Result<string, "URL protocol unsupported" | "Invalid URL"> => {
  let url: URL
  try {
    url = new URL(urlStr)
  } catch (error) {
    return Err("Invalid URL")
  }

  if (!["http:", "https:", "ipfs:", "ipns:"].includes(url.protocol))
    return Err("URL protocol unsupported")

  return Ok(url.host)
}
