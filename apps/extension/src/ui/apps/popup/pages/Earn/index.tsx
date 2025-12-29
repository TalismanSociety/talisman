import { FC } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

import { EarnAssetsStateProvider } from "@ui/domains/Earn/context/EarnAssetsStateContext"
import { PortfolioContainer } from "@ui/domains/Portfolio/PortfolioContainer"

import { PopupLayout } from "../../Layout/PopupLayout"
import { PopupEarnDiscoverRoute, PopupEarnPage, PopupEarnPositionsRoute } from "./PopupEarnPage"
import { PopupYieldxyzYieldPositionsPage } from "./PopupYieldxyzYieldPositionsPage"

export const PopupEarnRoutes: FC = () => {
  return (
    <PortfolioContainer>
      <PopupLayout>
        <EarnAssetsStateProvider>
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
          </Routes>
        </EarnAssetsStateProvider>
      </PopupLayout>
    </PortfolioContainer>
  )
}
