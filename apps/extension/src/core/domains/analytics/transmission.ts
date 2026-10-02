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
          endpoint: "https://z.talisman.xyz/batch/",
          apiKey: "phc_yu6w76nJUBWVNDu5PjpwWFjd3ko3WAu6ouWYyArtkW6b",
        }
