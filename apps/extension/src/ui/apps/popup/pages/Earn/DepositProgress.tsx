// import { useSearchParams } from "react-router-dom"

// import { AnalyticsPage } from "@ui/api/analytics"
// import { SendFundsProgress } from "@ui/domains/SendFunds/SendFundsProgress"

// import { EarnLayout } from "./EarnLayout"

// export const DepositProgress = () => {
//   const [sp] = useSearchParams()
//   const txId = sp.get("txId") || ""
//   const networkId = sp.get("networkId") || ""
//   const analytics: AnalyticsPage = {
//     container: "Popup",
//     feature: "Earn Yield",
//     featureVersion: 1,
//     page: "Deposit Progress",
//   }

//   return (
//     <EarnLayout title="Transfer in progress" analytics={analytics}>
//       <SendFundsProgress txId={txId} networkId={networkId} />
//     </EarnLayout>
//   )
// }
