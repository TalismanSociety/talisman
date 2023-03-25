import { Address } from "@core/types/base"
import { balancesQuery } from "@ui/atoms"
import { useRecoilValue } from "recoil"

const useBalancesByAddress = (address: Address) => useRecoilValue(balancesQuery({ address }))

export default useBalancesByAddress
