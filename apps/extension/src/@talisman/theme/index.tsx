import "./fonts.css"

import { FC, PropsWithChildren } from "react"
import { ThemeProvider } from "styled-components"

import Global from "./global"
import themes from "./theme"
import Variables from "./variables"

const Provider: FC<PropsWithChildren> = ({ children }) => {
  return (
    <ThemeProvider theme={themes["dark"]}>
      <Variables />
      <Global />
      {children}
    </ThemeProvider>
  )
}

export default Provider
