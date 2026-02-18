import { TaoDataApi } from "./TaoDataApi"

export const TAO_DATA_API_URL = "https://tda.talisman.xyz"

export { TaoDataApi }

export const getTaoDataApi = () => new TaoDataApi({ baseUrl: TAO_DATA_API_URL })
