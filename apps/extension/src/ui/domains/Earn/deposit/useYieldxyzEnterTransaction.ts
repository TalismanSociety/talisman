import { useQuery } from "@tanstack/react-query"
import { ActionArgumentsDto, ActionDto } from "extension-core"
import { log, YIELD_API_BASE_URL } from "extension-shared"
import { useMemo } from "react"

import { useYieldxyzProduct } from "@ui/state/yield"

type UseYieldxyzEnterTransactionProps = {
  address: string | null
  yieldId: string | null
  amount: bigint | null
  validatorAddress?: string | null
}

export const useYieldxyzEnterTransaction = (props: UseYieldxyzEnterTransactionProps) => {
  const product = useYieldxyzProduct(props.yieldId)

  const enterArg = useMemo<ActionArgumentsDto | null>(() => {
    const expectedArgs = product.data?.mechanics.arguments?.enter
    if (!expectedArgs?.fields.length) return null // there should always be args (at least amount), not sure what to do if missing

    const args: ActionArgumentsDto = {}

    for (const field of expectedArgs.fields) {
      switch (field.name) {
        case "amount":
          if (!props.amount) return null
          args.amount = props.amount.toString()
          break
        case "validatorAddress":
          if (!props.validatorAddress) return null
          args.validatorAddress = props.validatorAddress
          break
        default:
          if (field.required) {
            log.warn("useYieldxyzEnterTransaction: unsupported required field", {
              product,
              fieldName: field.name,
            })
            return null
          }

          // just skip non-required fields for now
          break
      }
    }

    return args
  }, [product, props.amount, props.validatorAddress])

  return useQuery({
    queryKey: ["yieldxyzEnterTransaction", props.address, props.yieldId, enterArg],
    queryFn: ({ signal }) => {
      if (!props.address || !props.yieldId || !enterArg) return null
      return fetchYieldxyzEnterTransaction(props.yieldId, props.address, enterArg, signal)
    },
  })
}

const fetchYieldxyzEnterTransaction = async (
  yieldId: string,
  address: string,
  args: ActionArgumentsDto,
  signal: AbortSignal,
): Promise<ActionDto> => {
  const req = await fetch(`${YIELD_API_BASE_URL}/v1/actions/enter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      yieldId,
      address,
      arguments: args,
    }),
    signal,
  })

  if (!req.ok) throw new Error(`Yield.xyz API error: ${req.status} ${req.statusText}`)

  return req.json()
}
