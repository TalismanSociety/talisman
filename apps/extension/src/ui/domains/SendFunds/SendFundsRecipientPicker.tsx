import { AccountJsonAny } from "@core/domains/accounts/types"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { CheckCircleIcon, SearchIcon, TalismanHandIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccounts from "@ui/hooks/useAccounts"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import { default as debounce } from "lodash/debounce"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { FormFieldInputContainerProps, FormFieldInputText, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import Fiat from "../Asset/Fiat"
import { SendFundsAccountsList } from "./SendFundsAccountsList"
import { SendFundsSearchInput } from "./SendFundsSearchInput"

export const SendFundsRecipientPicker = () => {
  const { to, set } = useSendFunds()
  const [search, setSearch] = useState("")

  const handleSelect = useCallback(
    (address: string) => {
      set("to", address, true)
    },
    [set]
  )

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <div className="font-bold">To</div>
        <div className="grow">
          <SendFundsSearchInput onChange={setSearch} placeholder="Enter address" />
          {/* <FormFieldInputText
            className="text-base"
            containerProps={INPUT_CONTAINER_PROPS}
            before={<SearchIcon className="text-body-disabled" />}
            placeholder="Search by account name"
            onChange={handleSearchChange}
          /> */}
        </div>
      </div>
      <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
        <SendFundsAccountsList selected={to} search={search} onSelect={handleSelect} />
      </ScrollContainer>
      {/* <div className="bg-black-secondary border-grey-700 scrollable scrollable-800 w-full grow overflow-y-auto border-t">
        <AccountsList />
      </div> */}
      {/* <div className="min-h-full w-full grow border-t">
        <AccountsList selected={from} search={search} onSelect={handleAccountClick} />
      </div> */}
    </div>
  )
}
