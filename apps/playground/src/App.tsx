import "./styles/styles.css"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { WagmiProvider } from "wagmi"

import talismanLogo from "./assets/talisman-full-color.svg"
import { Ethereum } from "./components/Ethereum"
import { wagmiConfig } from "./components/Ethereum/shared/wagmiConfig"
import { Nav } from "./components/shared/Nav"
import { Substrate } from "./components/Substrate"
import { UIPage } from "./components/UI"

const queryClient = new QueryClient()

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <div className="container mx-auto max-w-screen-xl p-4">
          <div className="space-y-4 text-center ">
            <a href="https://talisman.xyz" target="_blank">
              <img src={talismanLogo} className="logo talisman" alt="Talisman logo" />
            </a>
            <BrowserRouter>
              <Nav />
              <Routes>
                <Route path="substrate/*" element={<Substrate />} />
                <Route path="ethereum/*" element={<Ethereum />} />
                <Route path="ui/*" element={<UIPage />} />
              </Routes>
            </BrowserRouter>
          </div>
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default App
