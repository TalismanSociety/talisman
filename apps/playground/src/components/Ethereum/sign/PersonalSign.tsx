import { classNames } from "@talismn/util"
import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "talisman-ui"
import { recoverMessageAddress } from "viem"
import { useAccount, useSignMessage } from "wagmi"

import { Section } from "../../shared/Section"

type FormData = { message: string }

const DEFAULT_VALUE: FormData = {
  message: `Message to sign
  line 2 of the message to sign
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  wallet should show a scrollbar`,
}

export const PersonalSign = () => (
  <Section title="Personal Sign">
    <PersonalSignInner />
  </Section>
)

const PersonalSignInner = () => {
  const { isConnected, address } = useAccount()

  const {
    register,
    handleSubmit,
    watch,
    formState: { isValid, isSubmitting },
  } = useForm<FormData>({
    defaultValues: DEFAULT_VALUE,
  })

  const message = watch("message")
  const { data: signature, isError, isLoading, isSuccess, signMessage, error } = useSignMessage()

  const onSubmit = useCallback(() => {
    signMessage?.({ message })
  }, [message, signMessage])

  const [signedBy, setSignedBy] = useState<`0x${string}`>()

  useEffect(() => {
    setSignedBy(undefined)
    if (signature) recoverMessageAddress({ message, signature }).then(setSignedBy)
  }, [message, signature])

  if (!isConnected) return null

  return (
    <>
      <form
        className="text-md text-body-secondary space-y-4 pt-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="flex items-center">
          <label className="w-48" htmlFor="send-tokens-to">
            Message
          </label>
          <textarea
            className="w-[60rem] "
            id="send-tokens-to"
            autoComplete="off"
            spellCheck={false}
            rows={4}
            {...register("message", { required: true })}
          />
        </div>
        <div>
          <Button small type="submit" processing={isLoading} disabled={!isValid || isSubmitting}>
            Sign this message
          </Button>
        </div>
      </form>
      <div className="my-8">
        {isSuccess && (
          <div>
            Signature : <span className="font-mono">{signature}</span>
          </div>
        )}
        {isError && <div className="text-alert-error my-8 ">Error : {error?.message}</div>}
        {signature && (
          <div>
            Signed by :{" "}
            <span
              className={classNames(
                "font-mono",
                signedBy === address ? "text-alert-success" : "text-alert-error"
              )}
            >
              {signedBy}
            </span>
          </div>
        )}
      </div>
    </>
  )
}
