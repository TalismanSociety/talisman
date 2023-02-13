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
}

const schema = yup.object({
  name: yup.string().required(""),
})

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Settings",
  featureVersion: 1,
  page: "Address book contact edit",
}

export const ContactEditModal = ({ contact, isOpen, close }: ContactModalProps) => {
  const { edit } = useAddressBook()
  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
    defaultValues: { name: contact.name },
  })

  const submit = useCallback(
    async (formData: FormValues) => {
      try {
        await edit({ ...contact, ...formData })
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
    [close, contact, edit, setError]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Modal open={isOpen} className="bg-black-secondary" onClose={close}>
      <ModalDialog title="Edit contact">
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
          <div>
            <div className="text-body-secondary block text-xs">Address</div>
            <div className="mt-3 block bg-none text-xs text-white">{contact.address}</div>
          </div>
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
