import { lazy, Suspense } from "react"
import { SendConfirmReap } from "./SendConfirmReap"
import { SendForm } from "./SendForm"
import { SendTokensProvider } from "./context"
import { SendTokensInputs } from "./types"
import { SendTransaction } from "./SendTransaction"
import { SendTokensModalDialog } from "./SendTokensModalDialog"

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
