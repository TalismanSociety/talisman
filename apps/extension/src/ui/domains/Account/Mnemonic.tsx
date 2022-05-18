import styled from "styled-components"
import Field from "@talisman/components/Field"
import HeaderBlock from "@talisman/components/HeaderBlock"
import Spacer from "@talisman/components/Spacer"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import * as yup from "yup"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { useCallback, useState } from "react"
import { FormField } from "@talisman/components/Field/FormField"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { api } from "@ui/api"
import { KeyIcon } from "@talisman/theme/icons"

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().trim().required(""),
  })
  .required()

const Mnemonic = ({ className }: any) => {
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
      {!!mnemonic ? (
        <>
          <HeaderBlock text="Your secret phrase protects your account. If you share it you may lose your funds." />
          <Spacer />
          <Field.Textarea className="secret" value={mnemonic} fieldProps={{ rows: 3 }} />
          <Spacer />
          <Field.Toggle
            className="toggle"
            info="Don't prompt me again"
            value={isConfirmed}
            onChange={(val: boolean) => toggleConfirmed(val)}
          />
        </>
      ) : (
        <form onSubmit={handleSubmit(submit)}>
          <HeaderBlock
            text={
              <>
                Your secret phrase protects your account. If you share it you may lose your funds.
                <br />
                <br />
                <strong>Enter your password to show your secret phrase</strong>.
              </>
            }
          />
          <Spacer />
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
          <div className="buttons">
            <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
              View Secret Phrase
            </SimpleButton>
          </div>
        </form>
      )}
    </div>
  )
}

const StyledMnemonic = styled(Mnemonic)`
  .toggle {
    flex-direction: row;
    justify-content: flex-end;
  }

  .secret {
    textarea {
      filter: blur(10px);
      cursor: pointer;
    }

    &:after {
      content: "☝";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: var(--font-size-large);
      filter: saturate(0);
      opacity: 0.5;
      cursor: pointer;
    }

    &:hover,
    &:focus-within {
      &:after {
        display: none;
      }
      textarea {
        filter: blur(0);
        cursor: auto;
      }
    }
  }

  .password {
    .message {
      color: var(--color-status-error);
    }
  }

  .buttons {
    display: flex;
    width: 100%;
    justify-content: flex-end;
  }

  form svg {
    opacity: 0.5;
  }
`

export default StyledMnemonic
