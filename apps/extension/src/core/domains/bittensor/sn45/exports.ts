import { Sn45Api } from "./Sn45Api"

const SN45_API_URL = "https://sn45api.talisman.xyz"
// export const SN45_API_URL = "http://localhost:8787"

export const getSn45Api = (customFetch?: typeof fetch) =>
  new Sn45Api({ baseUrl: SN45_API_URL, customFetch })
