import { createGandalfAuthorization, createGandalfFetch } from "@common/createGandalfFetch"
import {
  anchorClocks,
  elapsedSince,
  GANDALF_TOKEN_EXPIRY_BUFFER_MS,
} from "@common/gandalfTokenClock"
import { api } from "@ui/api"

const getAccessToken = async (): Promise<string> => {
  const requestedAt = anchorClocks()
  const accessToken = await api.gandalfAccessToken()
  if (elapsedSince(requestedAt) >= GANDALF_TOKEN_EXPIRY_BUFFER_MS)
    throw new Error("Gandalf access token reply arrived too late to be trusted")
  return accessToken
}

export const gandalfFetch = createGandalfFetch(getAccessToken)

export const getGandalfAuthorization = createGandalfAuthorization(getAccessToken)
