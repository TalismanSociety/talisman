import type { TokenId } from "@core/domains/tokens/types"
import { tokenQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

const useToken = (id: TokenId | null | undefined) => useRecoilValue(tokenQuery(id))

export default useToken
