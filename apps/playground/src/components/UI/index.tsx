import { Route, Routes } from "react-router-dom"

import { Background } from "./Background"
import { Buttons } from "./Buttons"
import { Checkboxes } from "./Chexkboxes"
import { DrawerPage } from "./Drawer"
import { ModalPage } from "./Modal"
import { NavUI } from "./NavUI"
import { Toggles } from "./Toggles"
import { TxStatusPage } from "./TxStatusPage"

export const UIPage = () => {
  return (
    <div>
      <NavUI />
      <Routes>
        <Route path="button" element={<Buttons />} />
        <Route path="checkbox" element={<Checkboxes />} />
        <Route path="toggle" element={<Toggles />} />
        <Route path="mystical-background" element={<Background />} />
        <Route path="tx-status" element={<TxStatusPage />} />
        <Route path="drawer" element={<DrawerPage />} />
        <Route path="modal" element={<ModalPage />} />
      </Routes>
    </div>
  )
}
