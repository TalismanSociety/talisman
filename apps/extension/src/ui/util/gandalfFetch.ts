import { createGandalfFetch } from "@common/createGandalfFetch"

import { gandalfAccessToken$ } from "../state/gandalf"

export const gandalfFetch = createGandalfFetch(gandalfAccessToken$)
