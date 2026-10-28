import { createGandalfAuthorization, createGandalfFetch } from "@common/createGandalfFetch"

import { gandalfAccessToken$ } from "../state/gandalf"

export const gandalfFetch = createGandalfFetch(gandalfAccessToken$)

export const getGandalfAuthorization = createGandalfAuthorization(gandalfAccessToken$)
