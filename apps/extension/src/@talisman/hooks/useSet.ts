import { useCallback, useMemo, useState } from "react"

const useSet = <T>(initialValues: T[] = []) => {
  const [_set, setSet] = useState(new Set(initialValues))

  const contains = useCallback((item: T) => _set.has(item), [_set])

  const set = useCallback((items: T[]) => {
    setSet(new Set(items))
  }, [])

  const add = useCallback((item: T) => {
    setSet((state) => new Set([...Array.from(state), item]))
  }, [])

  const remove = useCallback((item: T) => {
    setSet((state) => new Set([...Array.from(state).filter((i) => i !== item)]))
  }, [])

  const toggle = useCallback((item: T) => {
    setSet(
      (state) =>
        new Set(
          state.has(item)
            ? Array.from(state).filter((i) => i !== item)
            : [...Array.from(state), item]
        )
    )
  }, [])

  const clear = useCallback(() => {
    setSet(new Set([]))
  }, [])

  const reset = useCallback(() => {
    setSet(new Set(initialValues))
  }, [initialValues])

  const items = useMemo(() => Array.from(_set), [_set])

  return {
    items,
    contains,
    set,
    add,
    remove,
    toggle,
    clear,
    reset,
  }
}

export default useSet
