import { yupResolver } from "@hookform/resolvers/yup"
import { Modal } from "@talisman/components/Modal"
import { ModalDialog } from "@talisman/components/ModalDialog"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

import { ContactModalProps } from "./types"

type FormValues = {
  name: string
  address: string
}

const schema = yup.object({
  name: yup.string().required(""),
  address: yup.string().required(""),
})

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact create",
}

export const ContactCreateModal = ({ isOpen, close }: ContactModalProps) => {
  const { add } = useAddressBook()
  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
  })

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        await add({ ...formData, addressType: "ss58" })
        sendAnalyticsEvent({
          ...ANALYTICS_PAGE,
          name: "Interact",
          action: "Edit address book contact",
        })
        close()
      } catch (error) {
        setError("name", error as Error)
      }
    },
    [close, add, setError]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal open={isOpen} className="bg-black-secondary" onClose={close}>
      <ModalDialog title="Add new contact">
        <form onSubmit={handleSubmit(submit)} className="grid gap-8">
          <FormFieldContainer error={errors.name?.message} label="Name">
            <FormFieldInputText
              type="text"
              {...register("name")}
              placeholder="Contact name"
              autoComplete="off"
              spellCheck="false"
            />
          </FormFieldContainer>
          <FormFieldContainer error={errors.address?.message} label="Address">
            <FormFieldInputText
              type="text"
              {...register("address")}
              placeholder="Address"
              autoComplete="off"
              spellCheck="false"
            />
          </FormFieldContainer>

          <div className="flex items-stretch gap-4 pt-4">
            <Button fullWidth onClick={close}>
              Cancel
            </Button>
            <Button type="submit" fullWidth primary disabled={!isValid}>
              Save
            </Button>
          </div>
        </form>
      </ModalDialog>
    </Modal>
  )
}
