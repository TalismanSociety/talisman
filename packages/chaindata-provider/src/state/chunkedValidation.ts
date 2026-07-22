import {
  arrayItemsEqualWithYield,
  type ChunkedOptions,
  createTimeSlicer,
  forEachWithYield,
  keyByWithYield,
  type TimeSlicer,
  validateArrayWithYield,
} from "@talismn/util"
import z from "zod/v4"

import { AnyMiniMetadataSchema, NetworkSchema, TokenSchema } from "../chaindata"
import type { Chaindata, CustomChaindata } from "./schema"

/**
 * Chunked (cooperatively time-sliced) equivalents of ChaindataFileSchema.safeParse and
 * CustomChaindataSchema.safeParse (see ./schema.ts).
 *
 * Validating the whole file with one `schema.safeParse(data)` call blocks the JS thread
 * for the entire validation of thousands of networks/tokens. Element-wise validation of
 * `z.array(X)` is result-identical to the array parse (including TokenSchema's key-order
 * `.transform()` and default filling), so instead we validate each element inside a time
 * budget and yield the thread to the host event loop between slices.
 *
 * Parity with the sync schemas (guarded by chunkedValidation.test.ts):
 * - identical output data (values AND key order)
 * - identical issues (code/path/message), with element issue paths prefixed
 *   `[section, index, ...path]` like the array parse produces
 * - the file-level native-token `.check()` cross-reference only runs when the base parse
 *   produced no issues, matching zod's check gating
 */

export type ChunkedParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: z.ZodError }

const getSlicer = (options?: ChunkedOptions): TimeSlicer =>
  options?.slicer ?? createTimeSlicer({ budgetMs: options?.budgetMs, signal: options?.signal })

/** cheap top-level shape parse: replicates z.object's non-object/missing-field/wrong-type issues */
const ChaindataFileShapeSchema = z.object({
  networks: z.array(z.unknown()),
  tokens: z.array(z.unknown()),
  miniMetadatas: z.array(z.unknown()),
})

/** replicates CustomChaindataSchema's strictObject top level (unrecognized keys are issues) */
const CustomChaindataShapeSchema = z.strictObject({
  networks: z.array(z.unknown()).optional(),
  tokens: z.array(z.unknown()),
})

const prefixIssues = (
  section: string,
  errors: { index: number; error: z.ZodError }[]
): z.core.$ZodIssue[] =>
  errors.flatMap(({ index, error }) =>
    error.issues.map((issue) => ({ ...issue, path: [section, index, ...issue.path] }))
  )

const validateSection = async <T>(
  section: string,
  items: readonly unknown[],
  schema: z.ZodType<T>,
  issues: z.core.$ZodIssue[],
  slicer: TimeSlicer
): Promise<T[]> => {
  const result = await validateArrayWithYield<T, z.ZodError>(
    items,
    (item) => schema.safeParse(item),
    { slicer }
  )
  if (result.success) return result.data
  issues.push(...prefixIssues(section, result.errors))
  return []
}

/** the native-token cross-reference from ChaindataFileSchema/CustomChaindataSchema `.check()` */
const checkNativeTokens = async (
  value: { networks?: { id: string; nativeTokenId: string }[]; tokens: { id: string }[] },
  issues: z.core.$ZodIssue[],
  slicer: TimeSlicer
): Promise<void> => {
  const tokensById = await keyByWithYield(value.tokens, (t) => t.id, { slicer })
  await forEachWithYield(
    value.networks ?? [],
    (network, index) => {
      const nativeToken = tokensById[network.nativeTokenId]
      if (!nativeToken)
        issues.push({
          code: "custom",
          message: `Network ${network.id} has no native token`,
          input: value,
          path: ["networks", index, "nativeTokenId"],
        })
    },
    { slicer }
  )
}

export const parseChaindataFileChunked = async (
  input: unknown,
  options?: ChunkedOptions
): Promise<ChunkedParseResult<Chaindata>> => {
  const slicer = getSlicer(options)

  const shape = ChaindataFileShapeSchema.safeParse(input)
  if (!shape.success) return { success: false, error: shape.error }

  const issues: z.core.$ZodIssue[] = []
  const networks = await validateSection(
    "networks",
    shape.data.networks,
    NetworkSchema,
    issues,
    slicer
  )
  const tokens = await validateSection("tokens", shape.data.tokens, TokenSchema, issues, slicer)
  const miniMetadatas = await validateSection(
    "miniMetadatas",
    shape.data.miniMetadatas,
    AnyMiniMetadataSchema,
    issues,
    slicer
  )

  const data: Chaindata = { networks, tokens, miniMetadatas }

  // like zod, only run the file-level check when the base parse produced no issues
  if (!issues.length) await checkNativeTokens(data, issues, slicer)

  if (issues.length) return { success: false, error: new z.ZodError(issues) }
  return { success: true, data }
}

export const parseCustomChaindataChunked = async (
  input: unknown,
  options?: ChunkedOptions
): Promise<ChunkedParseResult<CustomChaindata>> => {
  const slicer = getSlicer(options)

  const shape = CustomChaindataShapeSchema.safeParse(input)
  if (!shape.success) return { success: false, error: shape.error }

  const issues: z.core.$ZodIssue[] = []
  const networks =
    shape.data.networks !== undefined
      ? await validateSection("networks", shape.data.networks, NetworkSchema, issues, slicer)
      : undefined
  const tokens = await validateSection("tokens", shape.data.tokens, TokenSchema, issues, slicer)

  // like z.object, don't add missing optional keys to the output
  const data: CustomChaindata = networks !== undefined ? { networks, tokens } : { tokens }

  if (!issues.length) await checkNativeTokens(data, issues, slicer)

  if (issues.length) return { success: false, error: new z.ZodError(issues) }
  return { success: true, data }
}

/** chunked equivalent of lodash `isEqual(a, b)` for validated {networks,tokens,miniMetadatas} shapes */
export const chaindataEqualWithYield = async (
  a: Chaindata,
  b: Chaindata,
  options?: ChunkedOptions
): Promise<boolean> => {
  const slicer = getSlicer(options)
  return (
    (await arrayItemsEqualWithYield(a.networks, b.networks, { slicer })) &&
    (await arrayItemsEqualWithYield(a.tokens, b.tokens, { slicer })) &&
    (await arrayItemsEqualWithYield(a.miniMetadatas, b.miniMetadatas, { slicer }))
  )
}
