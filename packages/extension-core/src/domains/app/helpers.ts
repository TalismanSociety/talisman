import { log } from "extension-shared"
import { Err, Ok, Result } from "ts-results"

export const getHostName = (url: string): Result<string, "Unable to get host from url"> => {
  try {
    const host = new URL(url).hostname
    return Ok(host)
  } catch (error) {
    log.error(url, error)
    return Err("Unable to get host from url")
  }
}
