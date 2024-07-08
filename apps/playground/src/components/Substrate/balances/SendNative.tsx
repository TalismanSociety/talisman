import { ExtrinsicStatus } from "@polkadot/types/interfaces"
import { useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"
import { useApi } from "../shared/useApi"
import { useWallet } from "../shared/useWallet"

type FormData = { recipient: string; plancks: string; withSignedTransaction: boolean }

const DEFAULT_VALUE: FormData = {
  recipient: "5EXb7e8Kq9m62XTFKVYmGsHFADU4knyFNg6NKJmLKDCz4Gij", // guardians account
  plancks: "0",
  withSignedTransaction: false,
}

export const SendBalance = () => (
  <Section title="Send Native Tokens">
    <SendBalanceInner />
  </Section>
)

const SendBalanceInner = () => {
  const { api } = useApi()
  const { account } = useWallet()

  const {
    register,
    handleSubmit,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: DEFAULT_VALUE,
  })

  const [status, setStatus] = useState<ExtrinsicStatus>()
  const [txError, setTxError] = useState<Error>()
  const [txProcessing, setTxProcessing] = useState(false)

  const onSubmit = useCallback(
    async (data: FormData) => {
      setTxError(undefined)
      if (!api || !account) return
      try {
        setTxProcessing(true)
        const unsub = await api.tx.balances
          .transferAllowDeath(data.recipient, data.plancks)
          .signAndSend(
            account.address,
            { withSignedTransaction: data.withSignedTransaction },
            (result) => {
              const { status } = result
              setStatus(status)

              if (status.isFinalized) {
                unsub()
                setTxProcessing(false)
              }
            }
          )
      } catch (err) {
        setTxError(err as Error)
        setTxProcessing(false)
      }
    },
    [account, api]
  )

  if (!api || !account) return null

  return (
    <>
      <form className="mb-8 space-y-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center gap-8">
          <label htmlFor="recipient">Recipient : </label>
          <input
            id="recipient"
            type="text"
            autoComplete="off"
            spellCheck={false}
            {...register("recipient", { required: true })}
          />
        </div>
        <div className="flex items-center gap-8">
          <label htmlFor="plancks">Plancks : </label>
          <input
            id="plancks"
            type="text"
            autoComplete="off"
            spellCheck={false}
            {...register("plancks", { required: true })}
          />
        </div>
        <div className="flex items-center gap-8">
          <label htmlFor="withSignedTransaction">withSignedTransaction (Ledger support) : </label>
          <input
            id="withSignedTransaction"
            type="checkbox"
            {...register("withSignedTransaction")}
          />
        </div>
        <div className="flex gap-8">
          <Button disabled={!isValid} processing={isSubmitting || txProcessing} type="submit">
            Send
          </Button>
        </div>
        {status && <pre>TX progress : {JSON.stringify(status.toHuman(), undefined, 2)}</pre>}
        {txError && <div className="text-alert-error">{txError.message}</div>}
      </form>
    </>
  )
}
