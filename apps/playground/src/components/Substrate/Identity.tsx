import { useCallback, useEffect, useState } from "react"
import { Section } from "../Section"
import { useApi } from "./useApi"
import { ExtrinsicStatus } from "@polkadot/types/interfaces"
import { Option } from "@polkadot/types-codec"
import { Registration } from "@polkadot/types/interfaces/identity"
import { useWallet } from "./useWallet"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"

const useIdentity = () => {
  const { api } = useApi()
  const { account } = useWallet()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [value, setValue] = useState<Option<Registration>>()

  const refresh = useCallback(() => {
    if (!api || !account) return () => {}

    setError(undefined)
    setValue(undefined)
    setIsLoading(true)
    api.query.identity
      .identityOf<Option<Registration>>(account.address)
      .then(setValue)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [account, api])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    identityRegistration: value,
    error,
    isLoading,
    refresh,
  }
}

type FormData = { display: string }

const DEFAULT_VALUE: FormData = { display: "" }

export const Identity = () => {
  const { api } = useApi()
  const { account } = useWallet()
  const { isLoading, error, identityRegistration, refresh } = useIdentity()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: DEFAULT_VALUE,
  })

  useEffect(() => {
    setValue(
      "display",
      identityRegistration?.value
        ? (identityRegistration.value.info.display.asRaw.toHuman() as string)
        : "",
      {
        shouldValidate: true,
      }
    )
  }, [identityRegistration, identityRegistration?.value?.info?.display, setValue])

  const [status, setStatus] = useState<ExtrinsicStatus>()
  const [txError, setTxError] = useState<Error>()
  const [txProcessing, setTxProcessing] = useState(false)

  const onSubmit = useCallback(
    async (data: FormData) => {
      setTxError(undefined)
      if (!api || !account) return
      try {
        setTxProcessing(true)
        const unsub = await api.tx.identity
          .setIdentity({
            display: { raw: data.display },
          })
          .signAndSend(account.address, (result) => {
            const { status, events } = result
            setStatus(status)

            if (status.isFinalized) {
              const success = events.find(({ event }) => event.method === "ExtrinsicSuccess")
              const failed = events.find(({ event }) => event.method === "ExtrinsicFailed")
              // eslint-disable-next-line no-console
              console.log({ success, failed })
              unsub()
              setTxProcessing(false)
              refresh()
            }
          })
      } catch (err) {
        setTxError(err as Error)
        setTxProcessing(false)
      }
    },
    [account, api, refresh]
  )

  return (
    <Section title="Identity">
      <form className="mb-8 space-y-8" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex items-center gap-8">
          <label htmlFor="display">Display name : </label>
          <input
            id="display"
            type="text"
            autoComplete="off"
            spellCheck={false}
            {...register("display", { required: true })}
          />
        </div>
        <Button disabled={!isValid} processing={isSubmitting || txProcessing} type="submit">
          Update
        </Button>
        {status && <pre>TX progress : {JSON.stringify(status.toHuman(), undefined, 2)}</pre>}
        {txError && <div className="text-alert-error">{txError.message}</div>}
      </form>
      {!txProcessing && (
        <div>
          {isLoading && <div>Loading...</div>}
          {error && <div className="text-alert-error">{error.message}</div>}
          {identityRegistration && (
            <pre>{JSON.stringify(identityRegistration.toHuman(), undefined, 2)}</pre>
          )}
        </div>
      )}
    </Section>
  )
}
