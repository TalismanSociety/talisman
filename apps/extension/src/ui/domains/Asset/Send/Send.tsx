import { DEBUG } from "@core/constants"
import { Suspense, lazy } from "react"

import { SendTokensProvider } from "./context"
import { SendConfirmReap } from "./SendConfirmReap"
import { SendForm } from "./SendForm"
import { SendTokensModalDialog } from "./SendTokensModalDialog"
import { SendTransaction } from "./SendTransaction"
import { SendTokensInputs } from "./types"

const SendReview = lazy(() => import("./SendReview"))

export const Send = ({ ...initialValues }: Partial<SendTokensInputs>) => {
  return (
    <SendTokensProvider initialValues={initialValues}>
      <SendTokensModalDialog>
        <SendForm />
        <Suspense fallback={null}>
          <SendReview />
        </Suspense>
        <SendConfirmReap />
        <SendTransaction />
      </SendTokensModalDialog>
    </SendTokensProvider>
  )
}
