import React from "react"
import { RecoilRoot, RecoilRootProps } from "recoil"

export const TestWrapper: React.FC<React.PropsWithChildren & RecoilRootProps> = ({
  children,
  ...props
}) => {
  return (
    <RecoilRoot {...props}>
      <React.Suspense fallback={<div>loading children</div>}>{children}</React.Suspense>
    </RecoilRoot>
  )
}
