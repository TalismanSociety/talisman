import talismanLogo from "./assets/talisman-full-color.svg"
import "./styles/styles.css"
import { Buttons } from "./components/Buttons"
import { Nav } from "./components/Nav"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Checkboxes } from "./components/Chexkboxes"
import { Ethereum } from "./components/Ethereum"
import { Substrate } from "./components/Substrate"

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
            <Route path="substrate" element={<Substrate />} />
            <Route path="ethereum" element={<Ethereum />} />
            <Route path="button" element={<Buttons />} />
            <Route path="checkbox" element={<Checkboxes />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  )
}

export default App
