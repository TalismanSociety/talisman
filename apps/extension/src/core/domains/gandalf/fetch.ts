import { createGandalfFetch } from "@common/createGandalfFetch"

import { gandalfAccessToken$ } from "./observable"

export const gandalfFetch = createGandalfFetch(gandalfAccessToken$)
