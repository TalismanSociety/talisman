import { Option } from "@polkadot/types-codec"
import { ExtrinsicStatus } from "@polkadot/types/interfaces"
import { Registration } from "@polkadot/types/interfaces/identity"
import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"
import { useApi } from "../shared/useApi"
import { useWallet } from "../shared/useWallet"

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

export const Identity = () => (
  <Section title="Identity">
    <IdentityInner />
  </Section>
)

const IdentityInner = () => {
  const { api } = useApi()
  const { account } = useWallet()
  const { isLoading, error, identityRegistration, refresh } = useIdentity()

  const {
    register,
    handleSubmit,
    setValue,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    defaultValues: DEFAULT_VALUE,
  })

  useEffect(() => {
    setValue(
      "display",
      identityRegistration?.value?.info
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
          .signAndSend(account.address, { withSignedTransaction: true }, (result) => {
            const { status } = result
            setStatus(status)

            if (status.isFinalized) {
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

  const handleClearIdentityClick = useCallback(async () => {
    setTxError(undefined)
    if (!api || !account) return
    try {
      setTxProcessing(true)
      const unsub = await api.tx.identity.clearIdentity().signAndSend(account.address, (result) => {
        const { status } = result
        setStatus(status)

        if (status.isFinalized) {
          unsub()
          setTxProcessing(false)
          refresh()
        }
      })
    } catch (err) {
      setTxError(err as Error)
      setTxProcessing(false)
    }
  }, [account, api, refresh])

  if (!api || !account) return null

  return (
    <>
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
        <div className="flex gap-8">
          <Button disabled={!isValid} processing={isSubmitting || txProcessing} type="submit">
            Set Identity
          </Button>
          <Button
            disabled={!identityRegistration}
            processing={isSubmitting || txProcessing}
            onClick={handleClearIdentityClick}
          >
            Clear Identity
          </Button>
        </div>
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
    </>
  )
}
