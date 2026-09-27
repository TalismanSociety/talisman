import { createPollingSubscribeBalances } from "../shared/subscribeBalances"
import { MODULE_TYPE } from "./config"
import { fetchBalances } from "./fetchBalances"

export const subscribeBalances = createPollingSubscribeBalances(MODULE_TYPE, fetchBalances)
