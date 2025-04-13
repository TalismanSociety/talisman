import { Chain } from "./types"

export const getSendRequestResult = <Res>(
  chain: Chain,
  method: string,
  params: unknown[],
  isCacheable?: boolean,
): Promise<Res> => {
  return chain.connector.send(method, params, isCacheable) as Promise<Res>
}
