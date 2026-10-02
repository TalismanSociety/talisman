import { z } from "zod/v4"

export const DEFAULT_POSTHOG_URL = "https://z.talisman.xyz/batch/"

const remoteConfigSchema = z.object({
  postHogUrl: z.url().catch(DEFAULT_POSTHOG_URL),
  analytics: z.object({
    posthogApiKey: z.string().trim(),
    errorTrackingEnabled: z.boolean(),
    browsers: z.object({ chrome: z.boolean(), firefox: z.boolean() }),
  }),
})

export type AnalyticsRemoteConfig = z.infer<typeof remoteConfigSchema>

export const parseAnalyticsRemoteConfig = (raw: unknown): AnalyticsRemoteConfig | null =>
  remoteConfigSchema.safeParse(raw).data ?? null

export type Transmission =
  | {
      mode: "posthog"
      endpoint: string
      apiKey: string
      usage: boolean
      errorTracking: boolean
    }
  | { mode: "dev_log" }
  | { mode: "off" }

export const resolveTransmission = ({
  isDevBuild,
  build,
  config,
}: {
  isDevBuild: boolean
  build: "chrome" | "firefox"
  config: AnalyticsRemoteConfig | null
}): Transmission => {
  if (isDevBuild) return { mode: "dev_log" }
  if (!config?.analytics.posthogApiKey) return { mode: "off" }
  const { posthogApiKey, errorTrackingEnabled, browsers } = config.analytics
  return {
    mode: "posthog",
    endpoint: config.postHogUrl,
    apiKey: posthogApiKey,
    usage: browsers[build],
    errorTracking: errorTrackingEnabled && browsers[build],
  }
}
