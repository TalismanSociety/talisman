import { AddressBookContact } from "@core/domains/app/store.addressBook"
import { yupResolver } from "@hookform/resolvers/yup"
import { Drawer } from "@talisman/components/Drawer"
import { AnalyticsPage, sendAnalyticsEvent } from "@ui/api/analytics"
import { Address } from "@ui/domains/Account/Address"
import AccountAvatar from "@ui/domains/Account/Avatar"
import { useAddressBook } from "@ui/hooks/useAddressBook"
import { useAnalyticsPageView } from "@ui/hooks/useAnalyticsPageView"
import { FC, FormEventHandler, useCallback } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import { Button, FormFieldContainer, FormFieldInputText } from "talisman-ui"
import * as yup from "yup"

const INPUT_CONTAINER_PROPS = { className: "bg-grey-700" }

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
  border-top-right-radius: 1.6rem;
  border-top-left-radius: 1.6rem;
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
  parent?: HTMLElement | string | null
  asChild?: boolean
}> = ({ isOpen, close, address, addressType, asChild, parent }) => {
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

  // don't bubble up submit event, in case we're in another form (send funds)
  const submitWithoutBubbleUp: FormEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      e.preventDefault()
      handleSubmit(submit)(e)
      e.stopPropagation()
    },
    [handleSubmit, submit]
  )

  useAnalyticsPageView(ANALYTICS_PAGE)

  return (
    <Drawer asChild={asChild} open={isOpen} anchor="bottom" onClose={closeDrawer} parent={parent}>
      <Container className="bg-black-tertiary">
        <form onSubmit={submitWithoutBubbleUp}>
          <header className="flex flex-col items-center justify-center gap-6">
            <AccountAvatar address={address} />
            <span className="font-bold">
              {nameValue ? (
                `${nameValue}`
              ) : (
                <Address
                  className="address"
                  address={address}
                  endCharCount={6}
                  startCharCount={6}
                />
              )}
            </span>
          </header>
          <section className="my-4 mt-10">
            <FormFieldContainer error={errors.name?.message}>
              <FormFieldInputText
                containerProps={INPUT_CONTAINER_PROPS}
                type="text"
                {...register("name")}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                placeholder="Contact name"
                autoComplete="off"
              />
            </FormFieldContainer>
          </section>
          <footer>
            <div className="flex items-stretch gap-4">
              <Button fullWidth onClick={closeDrawer}>
                Cancel
              </Button>
              <Button
                className="disabled:bg-grey-700"
                type="submit"
                fullWidth
                primary
                processing={isSubmitting}
                disabled={!isValid}
              >
                Save
              </Button>
            </div>
          </footer>
        </form>
      </Container>
    </Drawer>
  )
}
