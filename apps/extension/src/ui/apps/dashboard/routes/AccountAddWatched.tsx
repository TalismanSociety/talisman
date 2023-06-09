import { AccountAddressType } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import Field from "@talisman/components/Field"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { getAddressType } from "@talisman/util/getAddressType"
import { classNames } from "@talismn/util"
import { sleep } from "@talismn/util"
import { api } from "@ui/api"
import { AccountTypeSelector } from "@ui/domains/Account/AccountTypeSelector"
import useAccounts from "@ui/hooks/useAccounts"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback, useEffect, useMemo, useRef } from "react"
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
  address: string
  type: AccountAddressType
  isPortfolio: boolean
}

const Spacer = styled.div<{ small?: boolean }>`
  height: ${({ small }) => (small ? "1.6rem" : "3.2rem")};
`

export const AccountAddWatched = () => {
  const { t } = useTranslation("account-add")
  const allAccounts = useAccounts()
  const accountNames = useMemo(() => allAccounts.map((a) => a.name), [allAccounts])
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")

  const schema = useMemo(
    () =>
      yup
        .object({
          name: yup.string().required("").notOneOf(accountNames, t("Name already in use")),
          address: yup
            .string()
            .trim()
            .required("")
            .when("type", {
              is: "ethereum",
              then: yup
                .string()
                .test(
                  "is-valid-address-eth",
                  t("Invalid address"),
                  (val) => !!val && getAddressType(val) === "ethereum"
                ),
              otherwise: yup
                .string()
                .test(
                  "is-valid-address-sub",
                  t("Invalid address"),
                  (val) => !!val && getAddressType(val) === "ss58"
                ),
            }),
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
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = useForm<FormData>({
    mode: "onChange",
    resolver: yupResolver(schema),
  })

  const submit = useCallback(
    async ({ name, address, isPortfolio }: FormData) => {
      const notificationId = notify(
        {
          type: "processing",
          title: t("Adding account"),
          subtitle: t("Please wait"),
        },
        { autoClose: false }
      )

      // pause to prevent double notification
      await sleep(1000)

      try {
        setAddress(await api.accountCreateWatched(name, address, isPortfolio))

        notifyUpdate(notificationId, {
          type: "success",
          title: t("Account added"),
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
      trigger()
    },
    [setValue, trigger]
  )

  const { type, isPortfolio } = watch()

  const handleIsPortfolioChange = useCallback(
    (checked: boolean) => {
      setValue("isPortfolio", checked, { shouldValidate: true })
    },
    [setValue]
  )

  const hasSetFocus = useRef(false)
  useEffect(() => {
    if (type && !hasSetFocus.current) {
      setFocus("name")
      hasSetFocus.current = true
    }
  }, [setFocus, type])

  return (
    <Container withBack centered>
      <HeaderBlock
        title={t("Choose account type")}
        text={t("What type of account would you like to add?")}
      />
      <Spacer />
      <form onSubmit={handleSubmit(submit)}>
        <AccountTypeSelector onChange={handleTypeChange} />
        <Spacer />
        <div className={classNames("hide", type && "show")}>
          <div>
            <p className="text-body-secondary">
              {t("Please enter the name and the wallet address you'll be watching.")}
            </p>
            <p className="text-body-disabled text-xs">
              {t(
                "Note that the address will be watch-only and will not be able to sign transactions."
              )}
            </p>
          </div>
          <Spacer small />
          <FormFieldContainer error={errors.name?.message}>
            <FormFieldInputText
              {...register("name")}
              placeholder={t("Choose a name")}
              spellCheck={false}
              autoComplete="off"
              data-lpignore
            />
          </FormFieldContainer>
          <FormFieldContainer error={errors.address?.message}>
            <FormFieldInputText
              {...register("address")}
              placeholder={t("Enter wallet address")}
              spellCheck={false}
              autoComplete="off"
              data-lpignore
            />
          </FormFieldContainer>
          <div className="bg-grey-850 mt-4 flex h-[58px] w-full items-center rounded px-12">
            <div className="grow space-y-4">
              <div className="text-body leading-none">{t("Include in my portfolio")}</div>
              <div className="text-body-disabled text-sm leading-none">
                {t(
                  "If toggled on, this account's balances will be included in your Total Portfolio"
                )}
              </div>
            </div>
            <Field.Toggle value={isPortfolio} onChange={handleIsPortfolioChange} />
          </div>
          <Spacer />
          <div className="buttons">
            <Button
              icon={ArrowRightIcon}
              type="submit"
              primary
              disabled={!isValid}
              processing={isSubmitting}
            >
              {t("Add")}
            </Button>
          </div>
        </div>
      </form>
    </Container>
  )
}
