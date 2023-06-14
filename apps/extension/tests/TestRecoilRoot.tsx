import React, { ReactNode, Suspense } from "react"
import { RecoilRoot } from "recoil"

export const TestRecoilRoot = ({ children }: { children: ReactNode }) => (
  <RecoilRoot>
    <Suspense>{children}</Suspense>
  </RecoilRoot>
)
