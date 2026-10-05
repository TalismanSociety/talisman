import { POSTHOG_INGEST_URL, POSTHOG_PROJECT_TOKEN } from "./posthogProject"

export type Transmission =
  | { mode: "posthog"; endpoint: string; apiKey: string }
  | { mode: "dev_log" }
  | { mode: "off" }

const OFF: Transmission = { mode: "off" }

/** The conditions stay inline: the bundler folds them, so a Firefox build holds no destination. */
export const TRANSMISSION: Transmission =
  process.env.BROWSER === "firefox"
    ? OFF
    : process.env.BUILD === "dev"
      ? { mode: "dev_log" }
      : process.env.BUILD_TYPE === "production" || process.env.BUILD_TYPE === "canary"
        ? {
            mode: "posthog",
            endpoint: POSTHOG_INGEST_URL,
            apiKey: POSTHOG_PROJECT_TOKEN,
          }
        : OFF
