import { log } from "@common/log"
import type { ActionArgumentsDto, ArgumentSchemaDto } from "@core/domains/earn/exports"
import type { InlineError } from "@ui/hooks/analytics/errorShown"
import { useMemo } from "react"

type UseYieldxyzEnterTransactionProps = {
  schema: ArgumentSchemaDto | null | undefined
  inputs: ActionArgumentsDto | null
}

export const useYieldxyzActionValidation = ({
  schema,
  inputs,
}: UseYieldxyzEnterTransactionProps) => {
  return useMemo((): { args: ActionArgumentsDto | null; error: InlineError | null } => {
    if (!schema || !inputs) return { args: null, error: null }

    const result: { args: ActionArgumentsDto | null; error: InlineError | null } = {
      args: {},
      error: null,
    }

    try {
      const inputsRecord = inputs as Record<string, unknown>
      for (const field of schema.fields) {
        if (field.required && !inputsRecord[field.name]) {
          result.error = { message: `${field.name} is required`, category: "input_invalid" }
          result.args = null
          break
        }

        if (inputsRecord[field.name]) {
          const value = inputsRecord[field.name]

          if (field.minimum && Number(value) < Number(field.minimum)) {
            result.error = {
              message: `Minimum ${field.name} is ${field.minimum}`,
              category: "below_minimum",
            }
            result.args = null
            break
          }

          if (field.maximum && Number(value) > Number(field.maximum)) {
            result.error = {
              message: `Maximum ${field.name} is ${field.maximum}`,
              category: "input_invalid",
            }
            result.args = null
            break
          }

          const args = result.args as Record<string, unknown>
          args[field.name] = value
        }
      }

      return result
    } catch (err) {
      log.error("useYieldxyzActionValidation: error during validation", { err, schema, inputs })
      return {
        args: null,
        error: { message: "Invalid arguments", category: "input_invalid" },
      }
    }
  }, [inputs, schema])
}
