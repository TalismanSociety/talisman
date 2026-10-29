import { createGandalfFetch } from "@common/createGandalfFetch"

import { getAccessToken } from "./accessToken"

export const gandalfFetch = createGandalfFetch(getAccessToken)
