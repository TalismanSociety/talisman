import { TaoDataApi } from "./TaoDataApi"

const TAO_DATA_API_URL = "https://tda.talisman.xyz"

export { TaoDataApi }

export const getTaoDataApi = (customFetch?: typeof fetch) =>
  new TaoDataApi({ baseUrl: TAO_DATA_API_URL, customFetch })
