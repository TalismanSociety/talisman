import { TransactionMethod } from "@core/domains/signing/types"
import { FC, useMemo } from "react"

import { ViewDetailsField } from "./ViewDetailsField"

type ViewDetailsTxDescProps = {
  label: string
  method?: TransactionMethod
}

export const ViewDetailsTxDesc: FC<ViewDetailsTxDescProps> = ({
  label = "Description",
  method,
}) => {
  const { main = "", steps = [] } = useMemo(() => {
    const isBatch =
      method && ["utility.batch", "utility.batchAll"].includes(`${method.section}.${method.method}`)

    return {
      isBatch,
      main: method?.docs?.[0],
      steps: (isBatch
        ? method?.args?.calls?.map?.((m: TransactionMethod) => m.docs?.[0])
        : []) as string[],
    }
  }, [method])

  if (!main) return null

  return (
    <ViewDetailsField label={label}>
      <div>{main}</div>
      {steps.length > 0 && (
        <>
          <div>Batch steps :</div>
          <ul>
            {steps.map((step, i) => (
              <li key={i}>- {step}</li>
            ))}
          </ul>
        </>
      )}
    </ViewDetailsField>
  )
}
