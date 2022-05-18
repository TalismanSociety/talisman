// @ts-nocheck
import { createContext, useContext, useState } from "react"
import { ThemeProvider } from "styled-components"
import themes from "./theme"
import Variables from "./variables"
import Global from "./global"
import "./fonts.css"

const Context = createContext({})

export const useTheme = () => useContext(Context)

const Provider = ({ defaultTheme = "dark", children }) => {
  const [theme, setTheme] = useState(defaultTheme || "light")
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark")
  const set = (mode) => setTheme(mode === "dark" ? "dark" : "light")

  return (
    <Context.Provider
      value={{
        theme,
        toggle,
        set,
      }}
    >
      <ThemeProvider theme={themes[theme]}>
        <Variables />
        <Global />
        {children}
      </ThemeProvider>
    </Context.Provider>
  )
}

export default Provider
