/* eslint-disable @typescript-eslint/no-unused-vars */
import { renderHook } from "@testing-library/react"
import { RecoilRoot, atom, useRecoilState } from "recoil"

const countState = atom({
  key: "countAtom",
  default: 0,
})

const useMyCustomHook = () => {
  const [count, setCount] = useRecoilState(countState)
  // Insert other Recoil state here...
  // Insert other hook logic here...
  return count
}

test("Test useMyCustomHook", () => {
  const { result } = renderHook(() => useMyCustomHook(), {
    wrapper: RecoilRoot,
  })
  expect(result.current).toEqual(0)
})
