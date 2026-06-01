import { useYieldxyzProviders } from "@ui/state/yieldxyz"
import { useMemo } from "react"

import { SEEK_PROVIDER_LOGO_URI, useSeekStakingOpportunity } from "../seek/useSeekStaking"
import type { EarnProvider } from "../types"

export const useEarnProviders = () => {
  const yieldProviders = useYieldxyzProviders()
  const seekOpportunity = useSeekStakingOpportunity()

  const data = useMemo<EarnProvider[]>(() => {
    const providers: EarnProvider[] =
      yieldProviders.data
        ?.filter((provider) => provider.type === "protocol")
        .map((provider) => ({
          id: provider.id,
          name: provider.name,
          type: "protocol",
          logoURI: provider.logoURI ?? null,
        })) ?? []

    if (seekOpportunity.data)
      providers.push({
        id: "seek",
        name: "SEEK",
        type: "custom",
        logoURI: SEEK_PROVIDER_LOGO_URI,
      })

    return providers.sort((a, b) => a.name.localeCompare(b.name))
  }, [seekOpportunity.data, yieldProviders.data])

  const status =
    yieldProviders.status === "loading" || seekOpportunity.status === "pending"
      ? "loading"
      : yieldProviders.status === "error" || seekOpportunity.status === "error"
        ? "error"
        : "success"

  return useMemo(() => ({ status, data }), [data, status])
}
