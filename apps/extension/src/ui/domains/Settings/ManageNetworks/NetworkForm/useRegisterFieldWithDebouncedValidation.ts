import debounce from "lodash/debounce"
import { useCallback } from "react"
import {
  ChangeHandler,
  FieldPath,
  FieldValues,
  RegisterOptions,
  UseFormRegister,
  UseFormRegisterReturn,
  UseFormTrigger,
} from "react-hook-form"

// inspired from https://github.com/react-hook-form/react-hook-form/issues/40
export const useRegisterFieldWithDebouncedValidation = <
  TFieldValues extends FieldValues,
  TFieldPath extends FieldPath<TFieldValues>
>(
  name: TFieldPath,
  delay: number,
  trigger: UseFormTrigger<TFieldValues>,
  register: UseFormRegister<TFieldValues>,
  extraValidationCb?: (name: TFieldPath, value: FieldValues[TFieldPath]) => Promise<void>,
  options?: RegisterOptions<TFieldValues, FieldPath<TFieldValues>>
) => {
  const useFormRegisterReturn: UseFormRegisterReturn = register(name, options)
  const { onChange } = useFormRegisterReturn

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedTrigger = useCallback(
    debounce(async (value: FieldValues[TFieldPath]) => {
      trigger(name)
      extraValidationCb && (await extraValidationCb(name, value))
    }, delay),
    [trigger, extraValidationCb, delay]
  )

  const handleChange = useCallback(
    (e: Parameters<ChangeHandler>[0]) => {
      onChange(e)
      debouncedTrigger(e.target.value)
    },
    [onChange, debouncedTrigger]
  )

  return {
    ...useFormRegisterReturn,
    onChange: handleChange,
  }
}
