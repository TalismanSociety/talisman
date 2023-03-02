import { FC, ReactNode, createContext, useContext } from "react"

/**
 * This utility generates a context provider from a react hook passed as argument
 *
 * @returns an array containing the provider and the consumer hook
 */
export const provideContext = <P, T>(useProviderContext: (props: P) => T) => {
  // automatic typing based on our hook's return type
  type ContextType = ReturnType<typeof useProviderContext>
  type ProviderProps = P & { children?: ReactNode }
  type ProviderType = FC<ProviderProps>

  const Context = createContext<ContextType | { __provideContextInternalDefaultValue: true }>({
    __provideContextInternalDefaultValue: true,
  })

  const Provider: ProviderType = ({ children, ...props }: ProviderProps) => {
    const ctx = useProviderContext(props as P)

    return <Context.Provider value={ctx}>{children}</Context.Provider>
  }

  const useProvidedContext = () => {
    const context = useContext(Context)

    if (typeof context === "object" && context && "__provideContextInternalDefaultValue" in context)
      throw new Error("This hook requires a provider to be present above it in the tree")

    return context
  }

  const result: [ProviderType, () => ContextType] = [Provider, useProvidedContext]
  return result
}
