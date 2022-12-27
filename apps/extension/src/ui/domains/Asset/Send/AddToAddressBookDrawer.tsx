import { AddressBookContact } from "@core/domains/app/store.addressBook"
import { yupResolver } from "@hookform/resolvers/yup"
import { Drawer } from "@talisman/components/Drawer"
import { FormField } from "@talisman/components/Field/FormField"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Address } from "@ui/domains/Account/Address"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { FC, useCallback } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import { Button } from "talisman-ui"
import * as yup from "yup"

const ANALYTICS_PAGE: AnalyticsPage = {
  container: "Fullscreen",
  feature: "Send Funds",
  featureVersion: 1,
  page: "Add to address book",
}

const Container = styled.div`
  width: 100%;
  max-width: 42rem;
  box-sizing: border-box;
  border: 1px solid var(--color-background-muted-3x);
  border-radius: 1.6rem;
  padding: 2.4rem 2.4rem 2.9rem 2.4rem;

  > section > p {
    color: var(--color-mid);
    font-size: 1.4rem;
    line-height: 2rem;
  }

  .account-avatar {
    font-size: 4rem;
  }
`

type FormValues = {
  name: string
}

const schema = yup.object({
  name: yup.string().required(""),
})

export const AddToAddressBookDrawer: FC<{
  isOpen: boolean
  close: () => void
  address: string
  addressType: AddressBookContact["addressType"]
}> = ({ isOpen, close, address, addressType }) => {
  const { add } = useAddressBook()
  const {
    register,
    handleSubmit,
    formState: { isValid, errors, isSubmitting },
    setError,
    watch,
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "all",
    reValidateMode: "onChange",
  })

  const nameValue = watch("name")

  const closeDrawer = useCallback(() => {
    reset()
    close()
  }, [reset, close])

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
        close()
      } catch (err) {
        setError("name", err as Error)
      }
    },
    [add, addressType, address, setError, close]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Drawer asChild open={isOpen} anchor="bottom" onClose={closeDrawer}>
      <Container className="bg-black-tertiary">
        <form onSubmit={handleSubmit(submit)}>
          <header className="flex flex-col justify-center gap-6">
            <AccountAvatar address={address} />
            <span className="font-bold">
              {nameValue ? `${nameValue}` : <Address className="address" address={address} />}
            </span>
          </header>
          <section className="my-8">
            <FormField error={errors.name}>
              <input
                type="text"
                {...register("name")}
                placeholder="Contact name"
                autoComplete="off"
              />
            </FormField>
          </section>
          <footer>
            <div className="flex items-stretch gap-4">
              <Button fullWidth onClick={closeDrawer}>
                Cancel
              </Button>
              <Button type="submit" fullWidth primary processing={isSubmitting} disabled={!isValid}>
                Save
              </Button>
            </div>
          </footer>
        </form>
      </Container>
    </Drawer>
  )
}
