import { AccountAddressType } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { FormField } from "@talisman/components/Field/FormField"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import * as yup from "yup"

import Layout from "../layout"

const Container = styled(Layout)`
  .hide {
    opacity: 0;
    transition: opacity var(--transition-speed) ease-in-out;
  }
  .show {
    opacity: 1;
  }

  .buttons {
    display: flex;
    width: 100%;
    justify-content: flex-end;
  }
`

type FormData = {
  name: string
  type: AccountAddressType
}

const Spacer = styled.div<{ small?: boolean }>`
  height: ${({ small }) => (small ? "1.6rem" : "3.2rem")};
`

const AccountNew = () => {
  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required("").notOneOf(accountNames, "Name already in use"),
          type: yup.string().required("").oneOf(["ethereum", "sr25519"]),
        })
        .required(),

    [accountNames]
  )

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    watch,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ name, type }: FormData) => {
      const notificationId = notify(
        {
          type: "processing",
          title: "Creating account",
          subtitle: "Please wait",
        },
        { autoClose: false }
      )

      // pause to prevent double notification
      await sleep(1000)

      try {
        setAddress(await api.accountCreate(name, type))

        notifyUpdate(notificationId, {
          type: "success",
          title: "Account created",
          subtitle: name,
        })
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: "Error creating account",
          subtitle: (err as Error)?.message,
        })
      }
    },
    [setAddress]
  )

  const handleTypeChange = useCallback(
    (type: AccountAddressType) => {
      setValue("type", type, { shouldValidate: true })
      setFocus("name")
    },
    [setFocus, setValue]
  )

  const type = watch("type")

  return (
    <Container withBack centered>
      <HeaderBlock
        title="Create a new account"
        text="What type of account would you like to create ?"
      />
      <Spacer />
      <form onSubmit={handleSubmit(submit)}>
        <AccountTypeSelector onChange={handleTypeChange} />
        <Spacer />
        <div className={classNames("hide", type && "show")}>
          <FormField error={errors.name}>
            <input
              {...register("name")}
              placeholder="Choose a name"
              spellCheck={false}
              autoComplete="off"
              autoFocus
              data-lpignore
            />
          </FormField>
          <Spacer />
          <div className="buttons">
            <SimpleButton type="submit" primary disabled={!isValid} processing={isSubmitting}>
              Create <ArrowRightIcon />
            </SimpleButton>
          </div>
        </div>
      </form>
    </Container>
  )
}

export default AccountNew
