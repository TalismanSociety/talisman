import { AddressBookContact } from "@core/domains/app/store.addressBook"
import { yupResolver } from "@hookform/resolvers/yup"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import { Address } from "@ui/domains/Account/Address"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { FC, FormEventHandler, useCallback, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { Button, Drawer, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { AccountIcon } from "../../Account/AccountIcon"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Send Funds",
  featureVersion: 1,
  page: "Add to address book",
}

type FormValues = {
  name: string
}

const schema = yup.object({
  name: yup.string().trim().required(""),
})

const AddToAddressBookDrawerForm: FC<{
  address: string
  addressType: AddressBookContact["addressType"]
  onClose?: () => void
}> = ({ address, addressType, onClose }) => {
  const { t } = useTranslation("send-funds")
  const { add } = useAddressBook()
  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
    reset,
    setFocus,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
  })

  const submit = useCallback(
    async ({ name }: FormValues) => {
      try {
        await add({ addressType, address, name })
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Interact",
          action: "Add address book contact",
          properties: {
            addressType,
          },
        })
        onClose?.()
      } catch (err) {
        setError("name", err as Error)
      }
    },
    [add, addressType, address, setError, onClose]
  )

  // don't bubble up submit event, in case we're in another form (send funds)
  const submitWithoutBubbleUp: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      handleSubmit(submit)(e)
      e.stopPropagation()
    },
    [handleSubmit, submit]
  )

  useEffect(() => {
    setTimeout(() => {
      setFocus("name")
    }, 250)
  }, [setFocus, reset])

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <form
      className="bg-grey-800 flex h-[26.8rem] flex-col justify-end rounded-t-xl p-12"
      onSubmit={submitWithoutBubbleUp}
    >
      <header className="flex flex-col items-center justify-center gap-6">
        <AccountIcon className="text-xl" address={address} />
        <span className="font-bold">
          <Address className="address" address={address} endCharCount={6} startCharCount={6} />
        </span>
      </header>
      <section className="my-4 mt-10">
        <FormFieldContainer error={errors.name?.message}>
          <FormFieldInputText
            {...register("name")}
            placeholder={t("Contact name")}
            autoComplete="off"
          />
        </FormFieldContainer>
      </section>
      <footer className="grid grid-cols-2 gap-8">
        <Button fullWidth onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button
          className="disabled:bg-grey-750"
          type="submit"
          fullWidth
          primary
          processing={isSubmitting}
          disabled={!isValid}
        >
          {t("Save")}
        </Button>
      </footer>
    </form>
  )
}

export const AddToAddressBookDrawer: FC<{
  address: string
  addressType: AddressBookContact["addressType"]
  containerId?: string
  asChild?: boolean
}> = ({ address, addressType, containerId }) => {
  const {
    drawers: { addressBookContact },
  } = useSendFundsWizard()
  return (
    <Drawer
      isOpen={addressBookContact.isOpen}
      anchor="bottom"
      onDismiss={addressBookContact.close}
      containerId={containerId}
    >
      <AddToAddressBookDrawerForm
        address={address}
        addressType={addressType}
        onClose={addressBookContact.close}
      />
    </Drawer>
  )
}
