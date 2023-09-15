import debounce from "lodash/debounce"
import { useCallback } from "react"
import {
  FieldPath,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
  UseFormRegisterReturn,
  UseFormTrigger,
} from "react-hook-form"

// inspired from https://github.com/react-hook-form/react-hook-form/issues/40
export const useRegisterFieldWithDebouncedValidation = <TFieldValues extends FieldValues>(
  name: FieldPath<TFieldValues>,
  delay: number,
  trigger: UseFormTrigger<TFieldValues>,
  register: UseFormRegister<TFieldValues>,
  options?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
) => {
  const useFormRegisterReturn: UseFormRegisterReturn = register(name, options)
  const { onChange } = useFormRegisterReturn

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debounce((e: any) => {
      onChange(e)
      trigger(name)
    }, delay),
    [name, trigger, onChange, delay]
  )

  return {
    ...useFormRegisterReturn,
    onChange: handleChange,
  }
}
