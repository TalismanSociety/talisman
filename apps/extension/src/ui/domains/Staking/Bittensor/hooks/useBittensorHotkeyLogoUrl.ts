import { getGithubBittensorHotkeyAssetUrl } from "@talismn/chaindata-provider"
import { useQuery } from "@tanstack/react-query"
import { createQueryStoragePersister, PERSIST_AGE_ONE_YEAR } from "@ui/hooks/queryStoragePersister"

type HotkeyLogos = Record<string, string>

const fetchHotkeyLogos = async ({ signal }: { signal: AbortSignal }): Promise<HotkeyLogos> => {
  const res = await fetch(getGithubBittensorHotkeyAssetUrl("logos.json"), { signal })
  if (!res.ok) throw new Error(`Failed to fetch hotkey logos (${res.status})`)
  return res.json()
}

export const useBittensorHotkeyLogoUrl = (hotkey: string) =>
  useQuery({
    queryKey: ["bittensor", "hotkeyLogos"] as const,
    queryFn: fetchHotkeyLogos,
    select: (logos) =>
      logos[hotkey] ? getGithubBittensorHotkeyAssetUrl(logos[hotkey]) : undefined,
    staleTime: 6 * 60 * 60_000,
    persister: createQueryStoragePersister({ maxAge: PERSIST_AGE_ONE_YEAR }),
  }).data
