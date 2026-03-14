import { REMOTE_CONFIG_API_URL } from "@common/constants"
import { RemoteConfigApi } from "./RemoteConfigApi"

const remoteConfigApi = new RemoteConfigApi({
  baseUrl: REMOTE_CONFIG_API_URL,
})

export const fetchRemoteConfig = async () => {
  const response = await remoteConfigApi.config.getRemoteConfig()
  return response.data
}

export type RemoteConfigData = Awaited<ReturnType<typeof fetchRemoteConfig>>
