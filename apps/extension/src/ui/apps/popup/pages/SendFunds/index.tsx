import { IconButton } from "@talisman/components/IconButton"
import { ChevronLeftIcon } from "@talisman/theme/icons"
import { Route, Routes } from "react-router-dom"

import { SendFundsWizardProvider } from "./context"
import { SendFundsAmount } from "./SendFundsAmount"
import { SendFundsConfirm } from "./SendFundsConfirm"
import { SendFundsFrom } from "./SendFundsFrom"
import { SendFundsLayout } from "./SendFundsLayout"
import { SendFundsSubmitted } from "./SendFundsSubmitted"
import { SendFundsTo } from "./SendFundsTo"
import { SendFundsToken } from "./SendFundsToken"

// ;<SendFundsLayout title="Send funds" onBackClick={() => alert("hey")}>
//   hey hey
// </SendFundsLayout>

export const SendFundsPage = () => {
  return (
    <SendFundsWizardProvider>
      <Routes>
        <Route path="token" element={<SendFundsToken />} />
        <Route path="from" element={<SendFundsFrom />} />
        <Route path="to" element={<SendFundsTo />} />
        <Route path="amount" element={<SendFundsAmount />} />
        <Route path="confirm" element={<SendFundsConfirm />} />
        <Route path="submitted" element={<SendFundsSubmitted />} />
        <Route path="*" element={<SendFundsToken />} />
      </Routes>
    </SendFundsWizardProvider>
  )
  //   return (
  //     <div className="flex h-full w-full flex-col">
  //       <div className="bg-brand-blue flex h-32 w-full px-12">
  //         <div className="w-12">
  //           <IconButton className="text-lg">
  //             <ChevronLeftIcon />
  //           </IconButton>
  //         </div>
  //         <div className="text-body-secondary grow text-center">Send from</div>
  //         <div className="w-12"></div>
  //       </div>
  //       <div className="bg-brand-pink w-full grow"></div>
  //     </div>
  //   )
}
