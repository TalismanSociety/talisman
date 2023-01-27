import { AccountJsonAny } from "@core/domains/accounts/types"
import { log } from "@core/log"
import { isEthereumAddress } from "@polkadot/util-crypto"
import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { CheckCircleIcon, SearchIcon, TalismanHandIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { useSendFundsWizard } from "@ui/apps/popup/pages/SendFunds/context"
import useAccounts from "@ui/hooks/useAccounts"
import useBalances from "@ui/hooks/useBalances"
import useBalancesByAddress from "@ui/hooks/useBalancesByAddress"
import useChain from "@ui/hooks/useChain"
import { useDebouncedState } from "@ui/hooks/useDebouncedState"
import useToken from "@ui/hooks/useToken"
import { default as debounce } from "lodash/debounce"
import { ChangeEventHandler, FC, useCallback, useEffect, useMemo, useState } from "react"
import { FormFieldInputContainerProps, FormFieldInputText, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import Fiat from "../Asset/Fiat"
import { SendFundsAccountsList } from "./SendFundsAccountsList"
import { SendFundsSearchInput } from "./SendFundsSearchInput"

const INPUT_CONTAINER_PROPS: FormFieldInputContainerProps = {
  small: true,
  className: "!px-8 h-[4.6rem] my-1 !bg-black-tertiary",
}

export const SendFundsAccountPicker = () => {
  const { from, set, tokenId } = useSendFundsWizard()
  const [search, setSearch] = useState("")

  const token = useToken(tokenId)
  const chain = useChain(token?.chain?.id)

  // maintain subscription to balances, as a search filter could close subscriptions from account rows
  useBalances()

  const allAccounts = useAccounts()

  const accounts = useMemo(
    () =>
      allAccounts
        .filter((account) => !search || account.name?.toLowerCase().includes(search))
        .filter((account) => {
          if (!token) return true
          switch (token.type) {
            case "evm-erc20":
            case "evm-native":
              return isEthereumAddress(account.address)
            case "substrate-native":
            case "substrate-orml":
              return !isEthereumAddress(account.address)
          }
          log.warn("Unsupported token type: %d", (token as any)?.type)
          return true
        })
        .filter((account) => !account.genesisHash || account.genesisHash === chain?.genesisHash),
    [allAccounts, chain?.genesisHash, search, token]
  )

  // const handleSearchChange: ChangeEventHandler<HTMLInputElement> = useCallback(
  //   (e) => {
  //     setSearch(e.target.value)
  //   },
  //   [setSearch]
  // )

  const handleSelect = useCallback(
    (address: string) => {
      set("from", address, true)
    },
    [set]
  )

  return (
    <div className="flex h-full min-h-full w-full flex-col overflow-hidden">
      <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
        <div className="font-bold">From</div>
        <div className="grow">
          <SendFundsSearchInput onChange={setSearch} placeholder="Search by account name" />
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
        <SendFundsAccountsList
          accounts={accounts}
          selected={from}
          onSelect={handleSelect}
          showBalances
          tokenId={tokenId}
          showIfEmpty
        />
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
