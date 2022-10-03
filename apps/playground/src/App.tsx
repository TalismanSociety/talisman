import { useState } from "react"
import talismanLogo from "./assets/talisman-full-color.svg"
import "./styles/styles.css"
import { Button } from "talisman-ui"
import { Buttons } from "./components/Buttons"
import { Nav } from "./components/Nav"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { Checkboxes } from "./components/Chexkboxes"

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container mx-auto max-w-screen-xl p-4">
      <div className="space-y-4 text-center ">
        <a href="https://talisman.xyz" target="_blank">
          <img src={talismanLogo} className="logo talisman" alt="Talisman logo" />
        </a>
        <BrowserRouter>
          <Nav />
          {/* <div>
            <Button onClick={() => setCount((count) => count + 1)}>count is {count}</Button>
          </div> */}
          <Routes>
            <Route path="button" element={<Buttons />} />
            <Route path="checkbox" element={<Checkboxes />} />
          </Routes>
        </BrowserRouter>
      </div>
    </div>
  )
}

export default App
