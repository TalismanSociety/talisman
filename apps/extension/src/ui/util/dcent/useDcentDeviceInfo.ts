import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import DcentWebConnector from "dcent-web-connector"

import { DcentError, dcentCall } from "./dcentCall"

type DcentDeviceInfo = {
  coinlist: { name: string }[]
  device_id: string
  fingerprint: { max: number; enrolled: number }
  fw_version: string
  ksm_version: string
  label: string
  state: "secure" // TODO are there other possible values ?
}

export const useDcentDeviceInfo = (options: UseQueryOptions = {}) => {
  const result = useQuery({
    queryKey: ["useDcentDeviceInfo"],
    queryFn: () => dcentCall<DcentDeviceInfo>(DcentWebConnector.getDeviceInfo),
    ...options,
  }) as UseQueryResult<DcentDeviceInfo | null, DcentError>

  return result
}
