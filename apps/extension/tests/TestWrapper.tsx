import React from "react"
import { RecoilRoot } from "recoil"

export const TestWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <RecoilRoot>
      <React.Suspense fallback={<div>loading children</div>}>{children}</React.Suspense>
    </RecoilRoot>
  )
}
