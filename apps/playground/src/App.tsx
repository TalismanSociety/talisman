import "./styles/styles.css"

import { BrowserRouter, Route, Routes } from "react-router-dom"

import talismanLogo from "./assets/talisman-full-color.svg"
import { Ethereum } from "./components/Ethereum"
import { Nav } from "./components/shared/Nav"
import { Substrate } from "./components/Substrate"
import { UIPage } from "./components/UI"

function App() {
  return (
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
  )
}

export default App
