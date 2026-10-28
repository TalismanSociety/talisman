import { ParsedMessage } from "@spruceid/siwe-parser"
import { decodePersonalSignMessage } from "./personalSignMessage"

export const parseSiweMessage = (message: string | undefined): ParsedMessage | null => {
  if (!message) return null
  const text = decodePersonalSignMessage(message)
  if (text === null) return null
  try {
    return new ParsedMessage(text)
  } catch {
    return null
  }
}
