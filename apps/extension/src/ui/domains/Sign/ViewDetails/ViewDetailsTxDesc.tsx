import { TransactionDetails } from "@core/types"
import { FC, useMemo } from "react"
import { ViewDetailsField } from "./ViewDetailsField"

type ViewDetailsTxDescProps = {
  label: string
  tx?: TransactionDetails | null
}

export const ViewDetailsTxDesc: FC<ViewDetailsTxDescProps> = ({ label, tx }) => {
  const { main = "", steps = [] } = useMemo(() => {
    return {
      main: tx?.method?.meta.docs[0],
      steps: tx?.batch?.map((m) => m.meta.docs[0]),
    }
  }, [tx])

  if (!main) return null

  return (
    <ViewDetailsField label="Description">
      <div>{main}</div>
      {steps.length > 0 && (
        <>
          <div>Batch steps :</div>
          <ul>
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </>
      )}
    </ViewDetailsField>
  )
}
