import { Address } from "@core/types/base"
import { balancesAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

const useBalancesByAddress = (address: Address) => useAtomValue(balancesAtomFamily({ address }))

export default useBalancesByAddress
