import "anylogger-loglevel"

import "./index.css"

import { balanceModules } from "@talismn/balances-default-modules"
import { BalancesProvider } from "@talismn/balances-react"
import React from "react"
import ReactDOM from "react-dom/client"

import { App } from "./App"

const onfinalityApiKey = undefined

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BalancesProvider balanceModules={balanceModules} onfinalityApiKey={onfinalityApiKey}>
      <App />
    </BalancesProvider>
  </React.StrictMode>
)
