import { createGandalfFetch } from "@common/createGandalfFetch"

import { getAccessToken } from "./observable"

export const gandalfFetch = createGandalfFetch(getAccessToken)
