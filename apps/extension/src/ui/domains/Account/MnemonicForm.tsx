import { yupResolver } from "@hookform/resolvers/yup"
import Field from "@talisman/components/Field"
import { FormField } from "@talisman/components/Field/FormField"

import Spacer from "@talisman/components/Spacer"
import { KeyIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import { Button } from "talisman-ui"
import * as yup from "yup"
import { Mnemonic } from "./Mnemonic"

const Description = () => (
  <div className="text-body-secondary whitespace-pre-wrap font-light">
    <p className="mt-1">
      Your recovery phrase gives you access to your wallet and funds. It can be used to restore your
      Talisman created accounts if you lose access to your device, or forget your password.
    </p>
    <p className="mt-1">
      We strongly encourage you to back up your recovery phrase by writing it down and storing it in
      a secure location.{" "}
      <a
        href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/back-up-your-secret-phrase"
        target="_blank"
        className="text-body opacity-100"
      >
        Learn more.
      </a>
    </p>
  </div>
)

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(""),
  })
  .required()

const MnemonicForm = ({ className }: any) => {
  const [mnemonic, setMnemonic] = useState<string>()
  const { isConfirmed, toggleConfirmed } = useMnemonicBackup()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ password }: FormData) => {
      try {
        setMnemonic(await api.mnemonicUnlock(password))
      } catch (err) {
        setError("password", {
          message: (err as Error)?.message ?? "",
        })
      }
    },
    [setError]
  )

  return (
    <div className={className}>
      {mnemonic ? (
        <>
          <Description />
          <Spacer small />
          <Mnemonic mnemonic={mnemonic} />
          <Spacer />
          <Field.Toggle
            className="toggle"
            info="I've backed it up"
            value={isConfirmed}
            onChange={(val: boolean) => toggleConfirmed(val)}
          />
        </>
      ) : (
        <form onSubmit={handleSubmit(submit)}>
          <Description />
          <strong>Enter your password to show your recovery phrase</strong>.
          <Spacer small />
          <FormField error={errors.password} prefix={<KeyIcon />}>
            <input
              {...register("password")}
              type="password"
              placeholder="Enter password"
              spellCheck={false}
              data-lpignore
              autoFocus
            />
          </FormField>
          <Spacer />
          <Button type="submit" fullWidth primary disabled={!isValid} processing={isSubmitting}>
            View Recovery Phrase
          </Button>
        </form>
      )}
    </div>
  )
}

const StyledMnemonicForm = styled(MnemonicForm)`
  .toggle {
    flex-direction: row;
    justify-content: flex-end;
  }

  form svg {
    opacity: 0.5;
  }
`

export default StyledMnemonicForm
