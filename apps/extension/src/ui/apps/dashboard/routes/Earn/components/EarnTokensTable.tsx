// import { useState } from "react"
// import { useTranslation } from "react-i18next"

// import { SearchInput } from "@talisman/components/SearchInput"
// import { EarnTabs } from "@ui/domains/Earn/EarnTabs"
// import {
//   setDiscoverSearch,
//   setYieldSearch,
//   useDiscoverSearch,
//   useYieldSearch,
// } from "@ui/state/yield"

// import { EarnAssetsTab } from "./EarnAssetsTab"
// import { EarnDiscoverTab } from "./EarnDiscoverTab"
// import { EarnPageHeader } from "./EarnPageHeader"

// export const EarnTokensTable = () => {
//   const { t } = useTranslation()
//   const [selectedTab, setSelectedTab] = useState("assets")
//   const assetsSearch = useYieldSearch()
//   const discoverSearch = useDiscoverSearch()

//   const handleTabChange = (tab: string) => {
//     setSelectedTab(tab)
//   }

//   return (
//     <div className="text-body-secondary flex min-w-[45rem] flex-col gap-6 text-left text-base">
//       {/* Header with total balance - always show */}
//       <EarnPageHeader />

//       {/* Tabs and Search in same row */}
//       <div className="mb-6 flex items-center justify-between">
//         <div className="flex-shrink-0">
//           <EarnTabs onTabChange={handleTabChange} />
//         </div>
//         {selectedTab === "assets" && (
//           <div className="w-[28rem]">
//             <SearchInput
//               containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
//               placeholder={t("Search DeFi positions")}
//               onChange={setYieldSearch}
//               initialValue={assetsSearch}
//             />
//           </div>
//         )}
//         {selectedTab === "discover" && (
//           <div className="w-[28rem]">
//             <SearchInput
//               containerClassName="!bg-field ring-transparent focus-within:border-grey-700 rounded-sm h-16 w-full border border-field text-xs !px-4"
//               placeholder={t("Search for assets")}
//               onChange={setDiscoverSearch}
//               initialValue={discoverSearch}
//             />
//           </div>
//         )}
//       </div>

//       {/* Tab Content */}
//       <div>
//         {selectedTab === "assets" && <EarnAssetsTab />}
//         {selectedTab === "discover" && <EarnDiscoverTab />}
//       </div>
//     </div>
//   )
// }
