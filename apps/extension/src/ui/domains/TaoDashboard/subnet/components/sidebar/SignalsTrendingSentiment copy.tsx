// import { ArrowDownRightIcon, ArrowUpRightIcon } from "@talismn/icons"
// import { cn } from "@talismn/util"
// import {
//   useSubnetEconomicsWithSentiment,
//   useSubnetTokenomics,
// } from "@ui/domains/TaoDashboard/hooks/useSn45Api"
// import type { TimePeriod } from "@ui/domains/TaoDashboard/shared/TaoDashboardPeriodTabs"
// import { type FC, type PropsWithChildren, type ReactNode, useMemo, useState } from "react"
// import { useTranslation } from "react-i18next"
// import { SectionTitleBar } from "./shared"

// export const SignalsTrendingSentiment: FC<{ netuid: number }> = ({ netuid }) => {
//   const { t } = useTranslation()
//   const [period, setPeriod] = useState<TimePeriod>("1W")
//   const { data: tokenomics, isLoading: tokenomicsLoading } = useSubnetTokenomics(netuid)
//   const { data: economics, isLoading: economicsLoading } = useSubnetEconomicsWithSentiment()
//   const isLoading = tokenomicsLoading || economicsLoading

//   return (
//     <div>
//       <SectionTitleBar label={t("Trending sentiment")} period={period} onPeriodChange={setPeriod} />

//       <div className="rounded-lg bg-grey-900 px-12 py-8">
//         {isLoading ? (
//           <TradingSentimentSkeleton />
//         ) : (
//           <TrendingSentiment
//             netuid={netuid}
//             period={period}
//             tokenomics={tokenomics}
//             economics={economics}
//           />
//         )}
//       </div>
//     </div>
//   )
// }

// type SubnetTokenomicsData = ReturnType<typeof useSubnetTokenomics>["data"]
// type SubnetEconomicsData = ReturnType<typeof useSubnetEconomicsWithSentiment>["data"]

// const TrendingSentiment: FC<
//   PropsWithChildren<{
//     netuid: number
//     period: TimePeriod
//     tokenomics: SubnetTokenomicsData
//     economics: SubnetEconomicsData
//   }>
// > = ({ netuid, tokenomics, economics }) => {
//   const { t } = useTranslation()
//   const economicsData = economics?.[netuid]

//   const alphaFlow = useMemo(() => {
//     if (!tokenomics) return 0
//     const alphaIn = parseFloat(tokenomics.alphaIn) / 1e9
//     const alphaOut = parseFloat(tokenomics.alphaOut) / 1e9
//     return alphaIn - alphaOut
//   }, [tokenomics])

//   const EMA = useMemo(() => {
//     if (!tokenomics?.emaTaoFlow) return 0
//     return parseFloat(tokenomics.emaTaoFlow) / 2 ** 64 / 1e9
//   }, [tokenomics])

//   const score = useMemo(() => {
//     return economicsData?.sentimentScore !== undefined
//       ? Math.round(((economicsData.sentimentScore + 2) / 4) * 100)
//       : 0
//   }, [economicsData])

//   const sentimentLabel = useSentimentLabel(score)

//   return (
//     <div className="flex h-[16.5rem] items-stretch gap-14">
//       <div className="flex h-full flex-col items-center justify-between">
//         <div className="mb-1 text-body-inactive text-xs">{t("Sentiment Score")}</div>
//         <SentimentGauge score={score} />
//         <div>{sentimentLabel}</div>
//       </div>

//       <div className="w-px self-stretch bg-grey-800" />

//       <div className="flex h-full flex-col items-start justify-between">
//         <SentimentField
//           label={t("Alpha Flow")}
//           className={cn(alphaFlow >= 0 ? "text-green" : "text-red-500")}
//         >
//           <div className="flex items-center gap-6">
//             <span>{formatCompactNumber(Math.abs(alphaFlow))}α</span>
//             {alphaFlow >= 0 ? (
//               <ArrowUpRightIcon className="size-8" />
//             ) : (
//               <ArrowDownRightIcon className="size-8" />
//             )}
//           </div>
//         </SentimentField>
//         <SentimentField label={t("EMA")} className={cn(EMA >= 0 ? "text-green" : "text-red-500")}>
//           {EMA >= 0 ? "+" : ""}
//           {EMA.toFixed(2)}
//         </SentimentField>
//         <SentimentField label={t("Combine Score")}>TODO</SentimentField>
//       </div>
//     </div>
//   )
// }

// const SentimentField: FC<PropsWithChildren<{ label: ReactNode; className?: string }>> = ({
//   label,
//   children,
//   className,
// }) => (
//   <div className={cn("flex flex-col gap-2")}>
//     <div className="text-body-inactive text-xs">{label}</div>
//     <div className={cn("text-md", className)}>{children}</div>
//   </div>
// )

// const SentimentGauge: FC<{ score: number }> = ({ score }) => {
//   const needleRotation = (score / 100) * 180 - 90

//   return (
//     <svg
//       width="118"
//       height="103"
//       viewBox="0 0 118 103"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//       className="h-[103px] w-[118px]"
//     >
//       {/* outer gradient shape */}
//       <path
//         d="M112.425 71.6381C114.629 72.1594 116.853 70.7968 117.22 68.5622C118.433 61.1737 118.232 53.6087 116.611 46.2731C114.695 37.6005 110.846 29.4724 105.351 22.4949C99.8553 15.5175 92.8555 9.87071 84.8734 5.9758C76.8913 2.0809 68.1329 0.038366 59.2513 0.00053521C50.3697 -0.0372955 41.5942 1.93055 33.5792 5.75732C25.5642 9.58408 18.5166 15.171 12.962 22.1014C7.40744 29.0318 3.48919 37.1269 1.49952 45.7828C-0.183427 53.1043 -0.449851 60.6673 0.700682 68.0659C1.04865 70.3036 3.26099 71.6851 5.46908 71.1825C7.67717 70.68 9.04238 68.4835 8.71953 66.2421C7.82792 60.0519 8.08544 53.738 9.49175 47.6199C11.2049 40.1671 14.5785 33.1972 19.361 27.2301C24.1436 21.263 30.2116 16.4526 37.1125 13.1577C44.0135 9.86288 51.5693 8.16855 59.2164 8.20112C66.8635 8.23369 74.4045 9.99233 81.2772 13.3459C88.1498 16.6994 94.1766 21.5613 98.9082 27.5689C103.64 33.5766 106.954 40.5749 108.603 48.0421C109.958 54.1719 110.161 60.4878 109.217 66.6702C108.875 68.9088 110.221 71.1168 112.425 71.6381Z"
//         fill="url(#paint0_linear_3288_4495)"
//       />
//       {/* central shape including needle */}
//       <g transform={`rotate(${needleRotation}, 59, 59)`}>
//         <path
//           d="M58.6179 4.30188C58.9746 3.52467 60.0796 3.52467 60.4363 4.30188L68.1443 21.0988C85.2611 25.2139 97.9812 40.6206 97.9812 59.0001C97.9811 80.5293 80.528 97.9825 58.9988 97.9825C37.4698 97.9823 20.0174 80.5291 20.0173 59.0001C20.0173 40.2021 33.323 24.5125 51.03 20.8341L58.6179 4.30188Z"
//           fill="#262626"
//         />
//       </g>
//       <text
//         x="59"
//         y="59"
//         textAnchor="middle"
//         dominantBaseline="middle"
//         fill="#fff"
//         fontSize="22"
//         fontWeight="700"
//       >
//         {Math.round(score)}
//       </text>
//       <defs>
//         <linearGradient
//           id="paint0_linear_3288_4495"
//           x1="116.42"
//           y1="60.5803"
//           x2="4.21428"
//           y2="60.5803"
//           gradientUnits="userSpaceOnUse"
//         >
//           <stop stopColor="#6CFC69" />
//           <stop offset="1" stopColor="#FD4848" />
//         </linearGradient>
//       </defs>
//     </svg>
//   )
// }

// const formatCompactNumber = (num: number): string => {
//   if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
//   if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
//   if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
//   return num.toFixed(0)
// }

// const useSentimentLabel = (score: number) => {
//   const { t } = useTranslation()

//   return useMemo(() => {
//     if (score >= 80) {
//       return t("Very Bullish")
//     } else if (score >= 60) {
//       return t("Bullish")
//     } else if (score >= 40) {
//       return t("Neutral")
//     } else if (score >= 20) {
//       return t("Bearish")
//     } else {
//       return t("Very Bearish")
//     }
//   }, [score, t])
// }

// const TradingSentimentSkeleton = () => (
//   <div className="flex h-[16.5rem] items-stretch gap-14">
//     <div className="flex h-full w-[118px] flex-col items-center justify-between">
//       <div className="mb-1 text-body-inactive text-xs">
//         <Skeleton className="w-[9rem]" />
//       </div>
//       <SentimentGaucheSkeleton />
//       {/* <SentimentGauge score={score} className="h-[103px] w-[118px]" /> */}
//       <div>
//         <Skeleton className="w-[6rem]" />
//       </div>
//     </div>

//     <div className="w-px self-stretch bg-grey-800" />

//     <div className="flex h-full flex-col items-start justify-between">
//       <SentimentFieldSkeleton />
//       <SentimentFieldSkeleton />
//       <SentimentFieldSkeleton />
//     </div>
//   </div>
// )

// const SentimentGaucheSkeleton = () => (
//   <svg
//     width="118"
//     height="103"
//     viewBox="0 0 118 103"
//     fill="none"
//     xmlns="http://www.w3.org/2000/svg"
//     className="h-[103px] w-[118px] animate-pulse"
//   >
//     <path
//       d="M112.425 71.6381C114.629 72.1594 116.853 70.7968 117.22 68.5622C118.433 61.1737 118.232 53.6087 116.611 46.2731C114.695 37.6005 110.846 29.4724 105.351 22.4949C99.8553 15.5175 92.8555 9.87071 84.8734 5.9758C76.8913 2.0809 68.1329 0.038366 59.2513 0.00053521C50.3697 -0.0372955 41.5942 1.93055 33.5792 5.75732C25.5642 9.58408 18.5166 15.171 12.962 22.1014C7.40744 29.0318 3.48919 37.1269 1.49952 45.7828C-0.183427 53.1043 -0.449851 60.6673 0.700682 68.0659C1.04865 70.3036 3.26099 71.6851 5.46908 71.1825C7.67717 70.68 9.04238 68.4835 8.71953 66.2421C7.82792 60.0519 8.08544 53.738 9.49175 47.6199C11.2049 40.1671 14.5785 33.1972 19.361 27.2301C24.1436 21.263 30.2116 16.4526 37.1125 13.1577C44.0135 9.86288 51.5693 8.16855 59.2164 8.20112C66.8635 8.23369 74.4045 9.99233 81.2772 13.3459C88.1498 16.6994 94.1766 21.5613 98.9082 27.5689C103.64 33.5766 106.954 40.5749 108.603 48.0421C109.958 54.1719 110.161 60.4878 109.217 66.6702C108.875 68.9088 110.221 71.1168 112.425 71.6381Z"
//       fill="#262626"
//     />
//     <g transform={`rotate(0, 59, 59)`}>
//       <path
//         d="M58.6179 4.30188C58.9746 3.52467 60.0796 3.52467 60.4363 4.30188L68.1443 21.0988C85.2611 25.2139 97.9812 40.6206 97.9812 59.0001C97.9811 80.5293 80.528 97.9825 58.9988 97.9825C37.4698 97.9823 20.0174 80.5291 20.0173 59.0001C20.0173 40.2021 33.323 24.5125 51.03 20.8341L58.6179 4.30188Z"
//         fill="#262626"
//       />
//     </g>
//   </svg>
// )

// const SentimentFieldSkeleton = () => (
//   <div className="flex flex-col gap-2">
//     <div className="text-body-inactive text-xs">
//       <Skeleton className="w-[6rem]" />
//     </div>
//     <div className="text-md">
//       <Skeleton className="w-[10rem]" />
//     </div>
//   </div>
// )

// const Skeleton: FC<PropsWithChildren<{ className?: string }>> = ({ className }) => (
//   <div
//     className={cn(
//       "my-px h-[0.9em] shrink-0 animate-pulse rounded-xs bg-grey-800 text-grey-800",
//       className
//     )}
//   />
// )
