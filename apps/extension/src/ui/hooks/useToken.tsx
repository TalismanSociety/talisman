import type { TokenId } from "@core/domains/tokens/types"
import { tokenByIdAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

const useToken = (id: TokenId | null | undefined) => useAtomValue(tokenByIdAtomFamily(id))

export default useToken
