import { AccountAddressType } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { Spacer } from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { classNames } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { DashboardLayout } from "../../layout/DashboardLayout"

type FormData = {
  name: string
  type: AccountAddressType
}

export const AccounAddDerivedPage = () => {
  const { t } = useTranslation("admin")
  // get type paramter from url
  const [params] = useSearchParams()
  const urlParamType = (params.get("type") ?? undefined) as AccountAddressType | undefined
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
    defaultValues: { type: urlParamType },
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

  useEffect(() => {
    // if we have a type in the url, set it
    if (urlParamType) handleTypeChange(urlParamType)
  }, [urlParamType, handleTypeChange])

  return (
    <DashboardLayout withBack centered>
      <HeaderBlock
        title={t("Create a new account")}
        text={!urlParamType && t("What type of account would you like to create ?")}
      />
      <Spacer small />
      <form onSubmit={handleSubmit(submit)}>
        <AccountTypeSelector defaultType={urlParamType} onChange={handleTypeChange} />
        <Spacer small />
        <div className={classNames("transition-opacity", type ? "opacity-100" : "opacity-0")}>
          <FormFieldContainer error={errors.name?.message}>
            <FormFieldInputText
              {...register("name")}
              placeholder={t("Choose a name")}
              spellCheck={false}
              autoComplete="off"
              data-lpignore
            />
          </FormFieldContainer>
          <Spacer small />
          <div className="flex w-full justify-end">
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
    </DashboardLayout>
  )
}
