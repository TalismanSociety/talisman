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
    <BalancesProvider
      balanceModules={balanceModules}
      onfinalityApiKey={onfinalityApiKey}
      // withTestnets
      // enabledChains={[
      //   // polkadot
      //   "0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3",
      //   // kusama
      //   "0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe",
      //   // rococo
      //   "0x6408de7737c59c238890533af25896a2c20608d8b380bb01029acb392781063e",
      //   // westend
      //   "0xe143f23803ac50e8f6f8e62695d1ce9e4e1d68aa36c1cd2cfd15340213f3423e",
      // ]}
    >
      <App />
    </BalancesProvider>
  </React.StrictMode>
)
