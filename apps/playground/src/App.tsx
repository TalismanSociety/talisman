import { useState } from "react"
import talismanLogo from "./assets/talisman-full-color.svg"
import "./styles/styles.css"
import { Button } from "talisman-ui"
import { Sumi } from "./components/Sumi"

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container mx-auto max-w-screen-xl p-4">
      <div className="space-y-4 text-center ">
        <a href="https://talisman.xyz" target="_blank">
          <img src={talismanLogo} className="logo talisman" alt="Talisman logo" />
        </a>
        <div>
          <Button onClick={() => setCount((count) => count + 1)}>count is {count}</Button>
        </div>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
        {/* <Buttons /> */}
        <Sumi />
      </div>
    </div>
  )
}

export default App
