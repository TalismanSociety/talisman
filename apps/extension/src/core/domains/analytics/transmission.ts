import { POSTHOG_INGEST_URL, POSTHOG_PROJECT_TOKEN } from "./posthogProject"

export type Transmission =
  | { mode: "posthog"; endpoint: string; apiKey: string }
  | { mode: "dev_log" }
  | { mode: "off" }

export const TRANSMISSION: Transmission =
  process.env.BROWSER === "firefox"
    ? { mode: "off" }
    : process.env.BUILD === "dev"
      ? { mode: "dev_log" }
      : {
          mode: "posthog",
          endpoint: POSTHOG_INGEST_URL,
          apiKey: POSTHOG_PROJECT_TOKEN,
        }
