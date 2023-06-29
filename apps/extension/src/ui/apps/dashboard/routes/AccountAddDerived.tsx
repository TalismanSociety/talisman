import { AccountAddressType } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import styled from "styled-components"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
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
  const { t } = useTranslation("admin")
  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required("").notOneOf(accountNames, t("Name already in use")),
          type: yup.string().required("").oneOf(["ethereum", "sr25519"]),
        })
        .required(),

    [accountNames, t]
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
          title: t("Creating account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false }
      )

      // pause to prevent double notification
      await sleep(1000)

      try {
        setAddress(await api.accountCreate(name, type))

        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account created"),
          subtitle: name,
        })
      } catch (err) {
        notifyUpdate(notificationId, {
          type: "error",
          title: t("Error creating account"),
          subtitle: (err as Error)?.message,
        })
      }
    },
    [setAddress, t]
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
        title={t("Create a new account")}
        text={t("What type of account would you like to create ?")}
      />
      <Spacer />
      <form onSubmit={handleSubmit(submit)}>
        <AccountTypeSelector onChange={handleTypeChange} />
        <Spacer />
        <div className={classNames("hide", type && "show")}>
          <FormFieldContainer error={errors.name?.message}>
            <FormFieldInputText
              {...register("name")}
              placeholder={t("Choose a name")}
              spellCheck={false}
              autoComplete="off"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              data-lpignore
            />
          </FormFieldContainer>
          <Spacer />
          <div className="buttons">
            <Button
              icon={ArrowRightIcon}
              type="submit"
              primary
              disabled={!isValid}
              processing={isSubmitting}
            >
              {t("Create")}
            </Button>
          </div>
        </div>
      </form>
    </Container>
  )
}

export default AccountNew
