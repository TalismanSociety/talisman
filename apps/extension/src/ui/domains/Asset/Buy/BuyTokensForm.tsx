import { AccountJson, AccountJsonAny } from "@core/domains/accounts/types"
import { yupResolver } from "@hookform/resolvers/yup"
import { Box } from "@talisman/components/Box"
import { Dropdown, RenderItemFunc } from "@talisman/components/Dropdown"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { ChevronRightIcon } from "@talisman/theme/icons"
import Account from "@ui/domains/Account"
import useAccounts from "@ui/hooks/useAccounts"
import { useCallback } from "react"
import { useForm } from "react-hook-form"
import styled from "styled-components"
import * as yup from "yup"

import { TokenAmountField } from "./TokenAmountField"
import { TokenPickerModal } from "./TokenPickerModal"

const Form = styled.form`
  padding-top: 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
`

const AccountDropDown = styled(Dropdown)<AccountJsonAny>`
  z-index: 1;
  display: block;

  button {
    width: 100%;
    height: 56px;
    padding: 0 1.6rem;
    align-items: center;
    > span,
    > span * {
      max-height: none;
    }

    .account-name > .text > .account-name-row .copy {
      display: none;
    }

    > span + span > svg {
      font-size: 2.4rem;
    }
    .copy {
      display: none;
    }
  }

  > ul {
    top: 5.2rem;

    > li {
      padding: 0.8rem 1.6rem;
    }
  }
`

const Button = styled(SimpleButton)`
  width: 100%;
  font-size: 1.8rem;
  height: 5.6rem;

  :disabled {
    background: var(--color-background-muted-3x);
    color: var(--color-background-muted-2x);
    opacity: 1;
  }
`

const Caption = styled.div`
  color: var(--color-background-muted-2x);
  font-size: 1.2rem;
  line-height: 1.2rem;
  font-weight: 500;
`

const renderAccountItem: RenderItemFunc<AccountJsonAny> = (account, key) => {
  return <Account.Name withAvatar address={account?.address} />
}

type FormData = {
  address: string
  amountUSD: number
}

const schema = yup.object({
  address: yup.string().required(""),
  amountUSD: yup.number().required("").min(0),
})

export const BuyTokensForm = () => {
  const accounts = useAccounts()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    mode: "all",
    resolver: yupResolver(schema),
    // defaultValues: {
    //   address: "",
    // },
    // reValidateMode: "onChange",
    // criteriaMode: "all",
  })

  const submit = useCallback(async (formData: FormData) => {
    //console.log("submit", formData)
  }, [])

  const handleOnChange = useCallback(
    (acc: AccountJsonAny) => {
      //console.log("handleChange", acc)
      setValue("address", acc?.address, { shouldValidate: true })
    },
    [setValue]
  )

  const handleTokenChanged = useCallback((symbol: string) => {
    //console.log("handleTokenChanged")
  }, [])

  const curr = watch()
  //console.log({ errors, curr, isValid })
  return (
    <Form onSubmit={handleSubmit(submit)}>
      <AccountDropDown
        items={accounts as AccountJsonAny[]}
        propertyKey="address"
        renderItem={renderAccountItem}
        onChange={handleOnChange}
        placeholder="Select Account"
      />
      <TokenAmountField
        fieldProps={register("amountUSD")}
        prefix="$"
        onTokenChanged={handleTokenChanged}
      />
      <Button type="submit" primary disabled={!isValid}>
        Continue
      </Button>
      <Caption>You will be taken to Banxa to complete this transaction</Caption>
    </Form>
  )
}
