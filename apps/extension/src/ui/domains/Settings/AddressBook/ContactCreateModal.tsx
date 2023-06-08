import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { notify } from "@talisman/components/Notifications"
import { convertAddress } from "@talisman/util/convertAddress"
import { AccountAddressType } from "@talisman/util/getAddressType"
import { isValidSubstrateAddress } from "@talisman/util/isValidSubstrateAddress"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import useAccounts from "@ui/hooks/useAccounts"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { ContactModalProps } from "./types"

type FormValues = {
  name: string
  address: string
  addressType: AccountAddressType
}

interface ValidationContext {
  accounts: string[]
  contacts: string[]
}

const ethRegex = new RegExp("^0[xX][a-fA-F0-9]{40}$")

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact create",
}

const normaliseMethods = {
  ss58: (addr: string) => convertAddress(addr, null),
  ethereum: (addr: string) => addr.toLowerCase(),
}

const normalise = (address: string, addressType?: "ss58" | "ethereum") =>
  normaliseMethods[addressType || "ss58"](address)

export const ContactCreateModal = ({ isOpen, close }: ContactModalProps) => {
  const { t } = useTranslation("settings")
  const { add, contacts } = useAddressBook()
  const accounts = useAccounts()

  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required(""),
        address: yup
          .string()
          .required("")
          .transform((value) => value.trim())
          .test("is-valid", t("Address is not valid"), (value, ctx) => {
            const context = ctx.options.context as ValidationContext
            if (!value) return false
            const isEthAddress = ethRegex.test(value) ?? isEthereumAddress(value.toLowerCase())
            const isValidAddress = isEthAddress || isValidSubstrateAddress(value)
            if (!isValidAddress) return ctx.createError({ message: t("Invalid Address") })

            const normalised = normalise(value, isEthAddress ? "ethereum" : "ss58")

            const { accounts, contacts } = context
            if (accounts.includes(normalised))
              return ctx.createError({ message: t("Cannot save a wallet address as a contact") })
            if (contacts.includes(normalised))
              return ctx.createError({ message: t("Address already saved in contacts") })
            return true
          }),
        addressType: yup.string().oneOf(["ss58", "ethereum"]).required(""),
      }),
    [t]
  )

  const { existingContactAddresses, existingAccountAddresses } = useMemo(
    () => ({
      existingContactAddresses: contacts.map((c) =>
        normalise(c.address, c.addressType === "UNKNOWN" ? "ss58" : c.addressType)
      ),
      existingAccountAddresses: accounts.map((acc) =>
        normalise(acc.address, acc.type === "ethereum" ? acc.type : "ss58")
      ),
    }),
    [contacts, accounts]
  )

  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
    setValue,
    reset,
    watch,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    context: {
      contacts: existingContactAddresses,
      accounts: existingAccountAddresses,
    },
    mode: "all",
    reValidateMode: "onChange",
  })

  useEffect(() => {
    if (isOpen) reset()
  }, [isOpen, reset])

  const address = watch("address")

  useEffect(() => {
    if (ethRegex.test(address)) setValue("addressType", "ethereum")
    else setValue("addressType", "ss58")
  }, [address, setValue])

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        await add({ ...formData })
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Interact",
          action: "Create address book contact",
        })
        notify({
          type: "success",
          title: t("New contact added"),
          subtitle: t("'{{name}}' is now in your address book", { name: formData.name }),
        })
        close()
      } catch (error) {
        setError("name", error as Error)
      }
    },
    [close, add, setError, t]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal open={isOpen} className="bg-black-secondary" onClose={close}>
      <ModalDialog title="Add new contact">
        <form onSubmit={handleSubmit(submit)} className="grid gap-8">
          <FormFieldContainer error={errors.name?.message} label={t("Name")}>
            <FormFieldInputText
              type="text"
              {...register("name")}
              placeholder={t("Contact name")}
              autoComplete="off"
              spellCheck="false"
            />
          </FormFieldContainer>
          <FormFieldContainer error={errors.address?.message} label={t("Address")}>
            <FormFieldInputText
              type="text"
              {...register("address")}
              placeholder={t("Address")}
              autoComplete="off"
              spellCheck="false"
            />
          </FormFieldContainer>

          <div className="flex items-stretch gap-4 pt-4">
            <Button fullWidth onClick={close}>
              {t("Cancel")}
            </Button>
            <Button type="submit" fullWidth primary processing={isSubmitting} disabled={!isValid}>
              {t("Save")}
            </Button>
          </div>
        </form>
      </ModalDialog>
    </Modal>
  )
}
