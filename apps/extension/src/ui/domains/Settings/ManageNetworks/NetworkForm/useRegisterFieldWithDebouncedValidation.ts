import debounce from "lodash/debounce"
import { useCallback } from "react"
import {
  ChangeHandler,
  FieldPath,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
  UseFormRegisterReturn,
} from "react-hook-form"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExtraValidationCb = (...args: any[]) => Promise<void>

// inspired from https://github.com/react-hook-form/react-hook-form/issues/40
export const useRegisterFieldWithDebouncedValidation = <
  TFieldValues extends FieldValues,
  TFieldPath extends FieldPath<TFieldValues>
>(
  name: TFieldPath,
  delay: number,
  register: UseFormRegister<TFieldValues>,
  extraValidationCb?: ExtraValidationCb,
  options?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
) => {
  const useFormRegisterReturn: UseFormRegisterReturn = register(name, options)
  const { onChange } = useFormRegisterReturn

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleChange = useCallback(
    debounce(async (e: Parameters<ChangeHandler>[0]) => {
      onChange(e)
      extraValidationCb && (await extraValidationCb(name, e.target.value))
    }, delay),
    [name, onChange, extraValidationCb, delay]
  )

  return {
    ...useFormRegisterReturn,
    onChange: handleChange,
  }
}
