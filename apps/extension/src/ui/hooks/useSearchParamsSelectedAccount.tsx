import { searchParamsSelectedAccount } from "@ui/atoms"
import { useRecoilValue } from "recoil"

export const useSearchParamsSelectedAccount = () => {
  const account = useRecoilValue(searchParamsSelectedAccount)

  return { account }
}
