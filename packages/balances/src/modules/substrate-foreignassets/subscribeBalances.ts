import { createRpcQuerySubscribeBalances } from "../shared/subscribeBalances"
import { buildQueries } from "./buildQueries"

export const subscribeBalances = createRpcQuerySubscribeBalances(buildQueries)
