import { Address } from "@extension/core"
import { balancesAtomFamily } from "@ui/atoms"
import { useAtomValue } from "jotai"

const useBalancesByAddress = (address: Address) => useAtomValue(balancesAtomFamily({ address }))

export default useBalancesByAddress
