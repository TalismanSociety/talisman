import { describe, expect, it } from "vitest"

import { fetchBestMetadata } from "./fetchBestMetadata"

const VERSIONS_14_15_16 = "0x0c0e0000000f00000010000000"
const MAGIC = "6d657461"
const OPAQUE_V15 = `0x01b50f${MAGIC}0fdeadbeef`

type Call = { method: string; params: unknown[]; isCacheable?: boolean }

const createRpcSend = (respond: (method: string, params: unknown[]) => unknown) => {
  const calls: Call[] = []
  const rpcSend = async <T>(method: string, params: unknown[], isCacheable?: boolean) => {
    calls.push({ method, params, isCacheable })
    return respond(method, params) as T
  }
  return { rpcSend, calls }
}

const withoutMetadataApi = (message: string) =>
  createRpcSend((method) => {
    if (method === "state_getMetadata") return `0x${MAGIC}0e`
    throw new Error(message)
  })

describe("fetchBestMetadata", () => {
  it("fetches the highest version up to v15 and strips the bytes before the magic number", async () => {
    const { rpcSend, calls } = createRpcSend((_method, params) =>
      params[0] === "Metadata_metadata_versions" ? VERSIONS_14_15_16 : OPAQUE_V15
    )

    expect(await fetchBestMetadata(rpcSend)).toBe(`0x${MAGIC}0fdeadbeef`)
    expect(calls).toEqual([
      { method: "state_call", params: ["Metadata_metadata_versions", "0x"], isCacheable: true },
      {
        method: "state_call",
        params: ["Metadata_metadata_at_version", "0x0f000000"],
        isCacheable: true,
      },
    ])
  })

  it.each([
    "Method Metadata_metadata_versions is not found",
    "Module doesn't have export Metadata_metadata_versions",
    "Exported method Metadata_metadata_versions is not found",
    "Execution, MethodNotFound, Metadata_metadata_versions",
  ])("falls back to state_getMetadata on chains without the Metadata api: %s", async (message) => {
    const { rpcSend, calls } = withoutMetadataApi(message)

    expect(await fetchBestMetadata(rpcSend)).toBe(`0x${MAGIC}0e`)
    expect(calls.at(-1)).toEqual({ method: "state_getMetadata", params: [], isCacheable: true })
  })

  it("falls back to state_getMetadata on any error when allowed", async () => {
    const { rpcSend } = withoutMetadataApi("Connection lost")

    expect(await fetchBestMetadata(rpcSend, true)).toBe(`0x${MAGIC}0e`)
  })

  it("throws on other errors", async () => {
    const { rpcSend, calls } = withoutMetadataApi("Connection lost")

    await expect(fetchBestMetadata(rpcSend)).rejects.toThrow("Failed to fetch metadata")
    expect(calls).toHaveLength(1)
  })

  it("throws when the metadata has no magic number", async () => {
    const { rpcSend } = createRpcSend((_method, params) =>
      params[0] === "Metadata_metadata_versions" ? VERSIONS_14_15_16 : "0x01deadbeef"
    )

    await expect(fetchBestMetadata(rpcSend)).rejects.toThrow("Failed to fetch metadata")
  })
})
