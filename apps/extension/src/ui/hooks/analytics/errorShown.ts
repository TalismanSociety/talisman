import { type ErrorCategory, isErrorCategory } from "@common/analytics/errorCategory"
import type { ERROR_SURFACES } from "@common/analytics/properties"
import { track } from "@ui/api/track"
import { type RefObject, useEffect } from "react"
import type { Id } from "react-toastify"

import { recordErrorOnInnermostFlow } from "./flows"

export type ErrorSurface = (typeof ERROR_SURFACES)[number]

type ErrorShown = { surface: ErrorSurface; category: ErrorCategory; field?: string }

export type InlineError = { message: string; category: ErrorCategory }

export const reportErrorShown = ({ surface, category, field }: ErrorShown) => {
  const attempt = recordErrorOnInnermostFlow(category)
  track("error_shown", {
    surface,
    error_category: category,
    ...attempt,
    ...(field && { field }),
  })
}

const reportedToasts = new Set<string>()

export const reportToastError = (toastId: Id, category: ErrorCategory) => {
  const key = `${toastId}|${category}`
  if (reportedToasts.has(key)) return
  reportedToasts.add(key)
  reportErrorShown({ surface: "toast", category })
}

export const useErrorShown = ({
  shown,
  surface,
  category,
  field,
}: {
  shown: string | false | null | undefined
} & ErrorShown) => {
  useEffect(() => {
    if (shown) reportErrorShown({ surface, category, field })
  }, [shown, surface, category, field])
}

const FIELD_NAME = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/

/** react-hook-form names nested fields `a.b[0]`: keep what `field` accepts, drop the rest. */
const toFieldName = (raw: string | null | undefined): string | undefined => {
  const name = raw?.replace(/\[(\d+)\]/g, ".$1")
  return name && FIELD_NAME.test(name) ? name : undefined
}

export const useFieldErrorShown = (
  error: string | null | undefined,
  root: RefObject<HTMLElement | null>,
  { field, category }: { field: string | undefined; category: ErrorCategory }
) => {
  const shown = error?.trim()
  useEffect(() => {
    if (!shown) return
    const input = root.current?.querySelector("input[name],textarea[name],select[name]")
    reportErrorShown({
      surface: "field",
      category,
      field: toFieldName(field ?? input?.getAttribute("name")),
    })
  }, [shown, root, field, category])
}

export const errorCategoryOfField = (
  error: { type?: unknown } | undefined
): ErrorCategory | undefined => (isErrorCategory(error?.type) ? error.type : undefined)
