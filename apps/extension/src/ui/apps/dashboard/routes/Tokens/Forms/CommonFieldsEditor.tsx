// import { Token, TokenBaseSchema } from "@talismn/chaindata-provider"
// import { FC, useState } from "react"
// import { useTranslation } from "react-i18next"
// import { FormFieldContainer, FormFieldInputText } from "talisman-ui"
// import { z } from "zod/v4"

// import { AssetLogoBase } from "@ui/domains/Asset/AssetLogo"
// import { useTokenFormContext, withTokenForm } from "../TokenPage"

// const TokenBaseFieldsSchema = TokenBaseSchema.pick({
//   decimals: true,
//   symbol: true,
//   coingeckoId: true,
//   name: true,
// })

// type TokenBaseFields = z.infer<typeof TokenBaseFieldsSchema>

// const formDataFromToken = (token: Token) => {
//   return TokenBaseFieldsSchema.parse({
//     symbol: token.symbol,
//     decimals: token.decimals,
//     coingeckoId: token.coingeckoId,
//     name: token.name,
//   })
// }

// // : FC<{
// //   token: Token
// //   onUpdate: (data: TokenBaseFields) => void
// // }>

// export const TokenFormCommonFieldsEditor = withTokenForm(({ ...formOptions }) => {
//   const { t } = useTranslation()

// //   const [editState, setEditState] = useState(() =>
// //     TokenBaseFieldsSchema.parse(formDataFromToken(token)),
// //   )

// // const form = useTokenFormContext()

//   // console.log("TokenCommonFieldsEditor", { editState })

//   //   useEffect(() => {

//   //   })

//   return (
//     <div>
//       <div className="grid grid-cols-2 gap-12">
//         <FormFieldContainer label={t("Symbol")}>
//           <FormFieldInputText
//             type="text"
//             value={editState.symbol}
//             onChange={(e) => setEditState({ ...editState, symbol: e.target.value })}
//             autoComplete="off"
//             small
//           />
//         </FormFieldContainer>
//         <FormFieldContainer label={t("Decimals")}>
//           <FormFieldInputText
//             type="number"
//             value={editState.decimals}
//             onChange={(e) => setEditState({ ...editState, decimals: Number(e.target.value) })}
//             placeholder="0"
//             autoComplete="off"
//             small
//           />
//         </FormFieldContainer>
//       </div>
//       <div className="grid grid-cols-2 gap-12">
//         <FormFieldContainer label={t("Coingecko ID")}>
//           <FormFieldInputText
//             type="text"
//             value={editState.coingeckoId}
//             onChange={(e) => setEditState({ ...editState, coingeckoId: e.target.value })}
//             autoComplete="off"
//             small
//             before={token && <AssetLogoBase className="mr-2 text-[3rem]" url={token?.logo} />}
//           />
//         </FormFieldContainer>
//         <FormFieldContainer label={t("Name")}>
//           <FormFieldInputText
//             type="text"
//             value={editState.name}
//             onChange={(e) => setEditState({ ...editState, name: e.target.value })}
//             autoComplete="off"
//             small
//           />
//         </FormFieldContainer>
//       </div>
//     </div>
//   )
// }
// )
