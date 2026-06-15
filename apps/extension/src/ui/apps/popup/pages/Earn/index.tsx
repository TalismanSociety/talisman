import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"
import type { FC } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { PopupLayout } from "../../Layout/PopupLayout"
import { PopupEarnDefiPositionPage } from "./PopupEarnDefiPositionPage"
import { PopupEarnDiscoverRoute, PopupEarnPage, PopupEarnPositionsRoute } from "./PopupEarnPage"
import { PopupSeekStakingPositionPage } from "./PopupSeekStakingPositionPage"
import { PopupYieldxyzYieldPositionsPage } from "./PopupYieldxyzYieldPositionsPage"

export const PopupEarnRoutes: FC = () => {
  return (
    <PortfolioContainer>
      <PopupLayout>
        <Routes>
          <Route path="" element={<PopupEarnPage />}>
            <Route index element={<Navigate to="positions" replace />} />
            <Route path="positions" element={<PopupEarnPositionsRoute />} />
            <Route path="discover" element={<PopupEarnDiscoverRoute />} />
          </Route>
          <Route
            path="positions/yieldxyz/:yieldId/:address"
            element={<PopupYieldxyzYieldPositionsPage />}
          />
          <Route path="positions/seek/:address" element={<PopupSeekStakingPositionPage />} />
          <Route path="positions/defi/:positionId" element={<PopupEarnDefiPositionPage />} />
        </Routes>
      </PopupLayout>
    </PortfolioContainer>
  )
}
