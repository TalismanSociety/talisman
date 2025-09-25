// import { RiskAnalysisPlatform } from "./types";
// import { RiskAnalysisResult } from "./useRiskAnalysisBase";

// export const getAccountChanges = (riskAnalysis: RiskAnalysisResult<RiskAnalysisPlatform>) => {
//     switch(riskAnalysis.platform) {
//         case "ethereum":
//             return riskAnalysis.result?.simulation?.account_changes ?? [];
//         case "solana":
//             return (riskAnalysis.result as unknown as { result?: { simulation?: { account_changes: unknown[] } } })?.result?.simulation?.account_changes ?? [];
//     }

// }
