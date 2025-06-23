// import {
//   EthNetwork,
//   EvmErc20Token,
//   EvmUniswapV2Token,
//   Token,
//   TokenBase,
//   TokenId,
// } from "@talismn/chaindata-provider"
// import { EthereumAddressSchema } from "@talismn/chaindata-provider/src/chaindata/shared"
// import { CopyIcon, ExternalLinkIcon } from "@talismn/icons"
// import { isTokenActive } from "extension-core"
// import { FC, useMemo, useState } from "react"
// import { useTranslation } from "react-i18next"
// import { FormFieldContainer, FormFieldInputText, IconButton } from "talisman-ui"
// import { z } from "zod/v4"

// import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
// import { NetworkSelect } from "@ui/domains/Ethereum/NetworkSelect"
// import { useActiveTokensState, useNetworkById, useToken } from "@ui/state"

// const FormDataSchema = z.strictObject({
//   symbol: z.string().nonempty(),
//   decimals: z.number().int().min(0).max(18),
//   coingeckoId: z.string().optional(),
//   name: z.string().optional(),
// })

// const formDataFromToken = (token: Token) => {
//   return FormDataSchema.parse({
//     symbol: token.symbol,
//     decimals: token.decimals,
//     coingeckoId: token.coingeckoId,
//     name: token.name,
//   })
// }

// export const TokenEditForm: FC<{ token: Token }> = ({ token }) => {
//   const { t } = useTranslation()

//   const [editState, setEditState] = useState(() => FormDataSchema.parse(formDataFromToken(token)))

//   return (
//     <form className="my-20 space-y-4">
//       <div className="grid grid-cols-2 gap-12">
//         <FormFieldContainer label={t("Symbol")}>
//           <FormFieldInputText type="text" value={token?.symbol} autoComplete="off" disabled small />
//         </FormFieldContainer>
//         <FormFieldContainer label={t("Decimals")}>
//           <FormFieldInputText
//             type="number"
//             value={token?.decimals}
//             placeholder="0"
//             autoComplete="off"
//             disabled
//             small
//           />
//         </FormFieldContainer>
//       </div>
//       <div className="grid grid-cols-2 gap-12">
//         <FormFieldContainer label={t("Coingecko ID")}>
//           <FormFieldInputText
//             type="text"
//             value={token?.coingeckoId}
//             autoComplete="off"
//             disabled
//             small
//             before={token && <AssetLogoBase className="mr-2 text-[3rem]" url={token?.logo} />}
//           />
//         </FormFieldContainer>
//         <FormFieldContainer label={t("Name")}>
//           <FormFieldInputText
//             type="number"
//             value={token?.name}
//             placeholder="0"
//             autoComplete="off"
//             disabled
//             small
//           />
//         </FormFieldContainer>
//       </div>
//     </form>
//   )
// }
