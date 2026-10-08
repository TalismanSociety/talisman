import { useCallback, useEffect, useRef, useState } from "react"

export const useAmountField = (
  amount: bigint | null,
  formattedAmount: string,
  parse: (text: string) => bigint | null,
  setAmount: (amount: bigint | null) => void
) => {
  const [text, setText] = useState(formattedAmount)
  const refTypedAmount = useRef<bigint | null | undefined>(undefined)
  const refSynced = useRef({ text: formattedAmount, amount })

  useEffect(() => {
    if (amount === refTypedAmount.current) return
    refSynced.current = { text: formattedAmount, amount }
    setText(formattedAmount)
  }, [amount, formattedAmount])

  useEffect(() => {
    if (amount !== null || refTypedAmount.current !== null) return
    const parsed = parse(text)
    if (parsed === null) return
    refTypedAmount.current = parsed
    setAmount(parsed)
  }, [amount, parse, text, setAmount])

  const onTextChange = useCallback(
    (nextText: string) => {
      const parsed =
        nextText === refSynced.current.text ? refSynced.current.amount : parse(nextText)
      refTypedAmount.current = parsed
      setText(nextText)
      setAmount(parsed)
    },
    [parse, setAmount]
  )

  return [text, onTextChange] as const
}
