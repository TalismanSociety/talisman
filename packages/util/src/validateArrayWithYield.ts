import { type ChunkedOptions, forEachWithYield } from "./chunkedArray"

export type ItemParseResult<T, E> = { success: true; data: T } | { success: false; error: E }

export type ArrayValidationResult<T, E> =
  | { success: true; data: T[] }
  | { success: false; errors: { index: number; error: E }[] }

/**
 * Validates every item of an array within a cooperative time budget, yielding the thread
 * to the host event loop whenever the budget for the current slice is exhausted.
 *
 * Like `z.array(schema).safeParse`, ALL items are validated and all failures collected
 * (no fail-fast) — pass e.g. `(item) => SomeSchema.safeParse(item)` as `parseItem`.
 * Zod-agnostic on purpose: this package has no zod dependency.
 */
export const validateArrayWithYield = async <T, E>(
  items: readonly unknown[],
  parseItem: (item: unknown, index: number) => ItemParseResult<T, E>,
  options?: ChunkedOptions
): Promise<ArrayValidationResult<T, E>> => {
  const data: T[] = new Array(items.length)
  const errors: { index: number; error: E }[] = []

  await forEachWithYield(
    items,
    (item, index) => {
      const result = parseItem(item, index)
      if (result.success) data[index] = result.data
      else errors.push({ index, error: result.error })
    },
    options
  )

  return errors.length ? { success: false, errors } : { success: true, data }
}
