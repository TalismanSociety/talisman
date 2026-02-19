import { Sn45Api } from "./Sn45Api"

export const SN45_API_URL = "https://sn45api.talisman.xyz"
// export const SN45_API_URL = "http://localhost:8787"

export { Sn45Api }

export const getSn45Api = () => new Sn45Api({ baseUrl: SN45_API_URL })
