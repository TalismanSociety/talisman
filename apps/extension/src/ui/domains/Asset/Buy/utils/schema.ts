import * as yup from "yup"

export const schema = yup.object({
  address: yup.string().required(" "),
  fiatAmount: yup.number().required(" ").min(0),
  tokenAmount: yup.number().required(" ").min(0),
  fiatCurrency: yup.string().required(" "),
  dirtyAmountField: yup.string().required(" "),
  rampTokenAsset: yup.object().shape({
    id: yup.string().required(),
    symbol: yup.string().required(),
    chain: yup.string().required(),
    chainId: yup.string().required(),
    decimals: yup.number().required(),
    isEvm: yup.boolean().required(),
    chainPrefix: yup.number().nullable().optional(),
    minPurchaseAmount: yup.number().required(" "),
  }),
})
