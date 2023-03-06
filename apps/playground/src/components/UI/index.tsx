import { BrowserRouter, Route, Routes } from "react-router-dom"

import { Background } from "./Background"
import { Buttons } from "./Buttons"
import { Checkboxes } from "./Chexkboxes"
import { NavUI } from "./NavUI"
import { TxStatusPage } from "./TxStatusPage"

export const UIPage = () => {
  return (
    <div>
      <NavUI />
      <Routes>
        <Route path="button" element={<Buttons />} />
        <Route path="checkbox" element={<Checkboxes />} />
        <Route path="mystical-background" element={<Background />} />
        <Route path="tx-status" element={<TxStatusPage />} />
      </Routes>
    </div>
  )
}
