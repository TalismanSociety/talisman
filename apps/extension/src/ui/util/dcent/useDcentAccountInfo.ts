import { UseQueryOptions, UseQueryResult, useQuery } from "@tanstack/react-query"
import DcentWebConnector from "dcent-web-connector"

import { DcentError, dcentCall } from "./dcentCall"

export type DcentAccount = {
  coin_name: string
  label: string
  address_path: string
  coin_group: string
}

type DcentAccountInfo = {
  account: DcentAccount[]
}

export const useDcentAccountInfo = (options: UseQueryOptions = {}) => {
  return useQuery({
    queryKey: ["useDecentAccounts"],
    queryFn: () => dcentCall<DcentAccountInfo>(DcentWebConnector.getAccountInfo),
    ...options,
  }) as UseQueryResult<DcentAccountInfo, DcentError>
}
