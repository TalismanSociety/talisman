// import { isTokenInTypes, Token } from "@talismn/chaindata-provider"
// import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
// import { FC } from "react"
// import { useTranslation } from "react-i18next"
// import { FormFieldContainer, FormFieldInputText, IconButton } from "talisman-ui"

// import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"

// export const TokenFormIdentifierFieldsEditor: FC<{ token: Token }> = ({ token }) => {
//   const { t } = useTranslation()

//   return (
//     <div>
//       <FormFieldContainer label="Network">
//         <NetworkSelect
//           withTestnets
//           defaultChainId={token?.networkId}
//           // disabling network edit because it would create a new token
//           disabled={!!token}
//           className="w-full"
//         />
//       </FormFieldContainer>
//       {isTokenInTypes(token, ["evm-erc20", "evm-uniswapv2"]) && (
//         <FormFieldContainer label={t("Contract Address")}>
//           <FormFieldInputText
//             type="text"
//             value={token?.contractAddress}
//             spellCheck={false}
//             data-lpignore
//             autoComplete="off"
//             // a token cannot change address
//             disabled
//             small
//             after={
//               <div className="flex items-center gap-4">
//                 <IconButton>
//                   <ExternalLinkIcon />
//                 </IconButton>
//                 <IconButton>
//                   <CopyIcon />
//                 </IconButton>
//               </div>
//             }
//           />
//         </FormFieldContainer>
//       )}
//     </div>
//   )
// }
