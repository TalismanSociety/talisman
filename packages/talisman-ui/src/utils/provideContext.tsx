import { createContext, FC, ReactNode, useContext } from "react"

const UNSET_CONTEXT = Symbol("UNSET_CONTEXT")

// This utility generates a context provider from a react hook passed as argument
// Returns an array containing the provider and the consumer hook
export const provideContext = <P, T>(useProviderContext: (props: P) => T) => {
  // automatic typing based on our hook's return type
  type ContextType = ReturnType<typeof useProviderContext>
  type ProviderProps = P & { children?: ReactNode }
  type ProviderType = FC<ProviderProps>

  const Context = createContext(UNSET_CONTEXT as ContextType)

  const Provider: ProviderType = ({ children, ...props }: ProviderProps) => {
    const ctx = useProviderContext(props as P)

    return <Context.Provider value={ctx}>{children}</Context.Provider>
  }

  const useProvidedContext = () => {
    const ctx = useContext(Context)

    // if default value is found, the hook is used outside of a provider
    if (ctx === UNSET_CONTEXT) throw new Error("useProvidedContext must be used within a Provider")

    return ctx
  }

  return [Provider, useProvidedContext] as [ProviderType, () => ContextType]
}
