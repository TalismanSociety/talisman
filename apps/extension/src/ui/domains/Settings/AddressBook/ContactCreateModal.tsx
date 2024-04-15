import { yupResolver } from "@hookform/resolvers/yup"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { notify } from "@talisman/components/Notifications"
import { convertAddress } from "@talisman/util/convertAddress"
import { isValidSubstrateAddress } from "@talisman/util/isValidSubstrateAddress"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { AddressFieldNsBadge } from "@ui/domains/Account/AddressFieldNsBadge"
import useAccounts from "@ui/hooks/useAccounts"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useResolveNsName } from "@ui/hooks/useResolveNsName"
import { useCallback, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { ModalDialog } from "talisman-ui"
import { Button, FormFieldContainer, FormFieldInputText, Modal } from "talisman-ui"
import * as yup from "yup"

import { ContactModalProps } from "./types"

type FormValues = {
  name: string
  searchAddress: string
  address: string
}

interface ValidationContext {
  accounts: string[]
  contacts: string[]
}

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
  const { t } = useTranslation("admin")
  const { add, contacts } = useAddressBook()
  const accounts = useAccounts()

  const schema = useMemo(
    () =>
      yup.object({
        name: yup.string().required(""),
        searchAddress: yup.string().required(""),
        address: yup
          .string()
          .required("")
          .transform((value) => value.trim())
          .test("is-valid", t("Address is not valid"), (value, ctx) => {
            const context = ctx.options.context as ValidationContext
            if (!value) return false
            const isEthAddress = isEthereumAddress(value)

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

  const { searchAddress } = watch()

  const [nsLookup, { nsLookupType, isNsLookup, isNsFetching }] = useResolveNsName(searchAddress)
  useEffect(() => {
    if (!isNsLookup) {
      setValue("address", searchAddress, {
        shouldValidate: true,
        shouldTouch: true,
        shouldDirty: true,
      })
      return
    }

    setValue("address", nsLookup ?? (nsLookup === null ? "invalid" : ""), {
      shouldValidate: true,
      shouldTouch: true,
      shouldDirty: true,
    })
  }, [nsLookup, isNsLookup, searchAddress, setValue])

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        const { name, address } = formData
        await add({
          name,
          address,
          addressType: isEthereumAddress(address) ? "ethereum" : "ss58",
        })
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
    <Modal isOpen={isOpen} onDismiss={close}>
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
              {...register("searchAddress")}
              placeholder={t("Address")}
              autoComplete="off"
              spellCheck="false"
              /* Fixes implicit min-width of approx. 180px */
              size={1}
              after={
                <AddressFieldNsBadge
                  nsLookup={nsLookup}
                  nsLookupType={nsLookupType}
                  isNsLookup={isNsLookup}
                  isNsFetching={isNsFetching}
                />
              }
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
