import { LIFI_API_URL } from "@core/domains/swaps/modules/lifi"
import type {
  ChainId,
  ChainKey,
  LiFiStep,
  LiFiStepRequest,
  RequestOptions,
  RoutesRequest,
  RoutesResponse,
  TokenExtended,
  TokensRequest,
  TokensResponse,
} from "@lifi/sdk"
import * as lifiSdk from "@lifi/sdk"
import { getGandalfAuthorization } from "@ui/util/gandalfFetch"

/** The slice of the @lifi/sdk action surface the LI.FI swap module consumes. */
export type LifiApi = {
  getTokens: (
    params?: TokensRequest & { extended?: false },
    options?: RequestOptions
  ) => Promise<TokensResponse>
  getToken: (
    chain: ChainKey | ChainId,
    token: string,
    options?: RequestOptions
  ) => Promise<TokenExtended>
  getRoutes: (params: RoutesRequest, options?: RequestOptions) => Promise<RoutesResponse>
  getStepTransaction: (step: LiFiStepRequest, options?: RequestOptions) => Promise<LiFiStep>
}

// LI.FI v4 replaced the global `createConfig` side-effect with an explicit client
// instance that must be passed to every action function (getTokens/getToken/getRoutes/…).
// The Talisman proxy requires a Gandalf access token on every request. The SDK
// builds `headers` as a plain object and spreads it again when it retries, so the
// interceptor keeps it a plain object.
const lifiClient = lifiSdk.createClient({
  integrator: "talisman",
  apiUrl: LIFI_API_URL,
  requestInterceptor: async (request) => {
    const authorization = await getGandalfAuthorization()
    if (!authorization) return request
    return {
      ...request,
      headers: { ...(request.headers as Record<string, string>), Authorization: authorization },
    }
  },
})

export const defaultLifiApi: LifiApi = {
  getTokens: (params, options) => lifiSdk.getTokens(lifiClient, params, options),
  getToken: (chain, token, options) => lifiSdk.getToken(lifiClient, chain, token, options),
  getRoutes: (params, options) => lifiSdk.getRoutes(lifiClient, params, options),
  getStepTransaction: (step, options) => lifiSdk.getStepTransaction(lifiClient, step, options),
}
