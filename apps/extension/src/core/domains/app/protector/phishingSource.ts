import { getHostName } from "../helpers"
import { isBlockaidMalicious } from "./blockaidSiteScan"
import { isPhishingSite } from "./ParaverseProtector"

export type PhishingSource = "lists" | "blockaid"

export async function getPhishingSource(url: string): Promise<PhishingSource | undefined> {
  if (await isPhishingSite(url)) return "lists"
  const { val: host, ok } = getHostName(url)
  return ok && isBlockaidMalicious(host) ? "blockaid" : undefined
}
