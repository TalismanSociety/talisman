import { yupResolver } from "@hookform/resolvers/yup"
import Field from "@talisman/components/Field"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { SimpleButton } from "@talisman/components/SimpleButton"
import Spacer from "@talisman/components/Spacer"
import { KeyIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import useMnemonicBackup from "@ui/hooks/useMnemonicBackup"
import { useCallback, useState } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import * as yup from "yup"

const Description = () => (
  <>
    <p>
      Your recovery phrase gives you access to your wallet and funds. It can be used to restore your
      Talisman created accounts if you lose access to your device, or forget your password.
    </p>
    <p>
      We strongly encourage you to back up your recovery phrase by writing it down and storing it in
      a secure location.{" "}
      <a
        href="https://docs.talisman.xyz/talisman/navigating-the-paraverse/account-management/back-up-your-secret-phrase"
        target="_blank"
      >
        Learn more
      </a>
    </p>
  </>
)

type FormData = {
  password: string
}

const schema = yup
  .object({
    password: yup.string().required(""),
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
      {mnemonic ? (
        <>
          <HeaderBlock text={<Description />} />
          <Spacer small />
          <Field.Textarea className="secret" value={mnemonic} fieldProps={{ rows: 3 }} />
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
          <HeaderBlock
            text={
              <>
                <Description />
                <strong>Enter your password to show your recovery phrase</strong>.
              </>
            }
          />
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
          <div className="buttons">
            <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
              View Recovery Phrase
            </SimpleButton>
          </div>
        </form>
      )}
    </div>
  )
}

const StyledMnemonic = styled(Mnemonic)`
  .header-block,
  .header-block p {
    font-style: normal;
    font-weight: 400;
    font-size: 1.8rem;
    line-height: 2.2rem;

    a,
    a:link,
    a:visited,
    a:hover {
      color: var(--color-foreground);
      opacity: 1;
    }

    strong {
      font-style: normal;
      font-weight: 400;
      font-size: 1.8rem;
      line-height: 2.2rem;
      color: var(--color-foreground);
    }
  }

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

  ${SimpleButton} {
    width: 100%;
  }
`

export default StyledMnemonic
