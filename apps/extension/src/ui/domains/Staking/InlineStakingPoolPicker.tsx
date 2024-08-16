import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "@talismn/icons"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconButton, Modal } from "talisman-ui"

import { ScrollContainer } from "@talisman/components/ScrollContainer"
import { SearchInput } from "@talisman/components/SearchInput"

import { useInlineStakingForm, useInlineStakingModal } from "./useInlineStaking"
import { useNominationPools } from "./useNominationPools"

export const InlineStakingPoolPicker = () => {
  const { t } = useTranslation()
  const { close } = useInlineStakingModal()
  const { token, poolPicker, setPoolId, pool } = useInlineStakingForm()
  const [_search, setSearch] = useState("")

  const pools = useNominationPools(token?.chain?.id)

  const handleSelect = useCallback(
    (poolId: number) => {
      setPoolId(poolId)
      poolPicker.close()
    },
    [poolPicker, setPoolId]
  )

  return (
    <Modal
      containerId="inlineStakingModalDialog"
      isOpen={poolPicker.isOpen}
      onDismiss={poolPicker.close}
      className="relative z-50 size-full"
    >
      <div className="flex size-full flex-grow flex-col bg-black">
        <header className="flex items-center justify-between p-10">
          <IconButton onClick={poolPicker.close}>
            <ChevronLeftIcon />
          </IconButton>
          <div>{"Select pool"}</div>
          <IconButton onClick={close}>
            <XIcon />
          </IconButton>
        </header>
        <div className="flex grow flex-col">
          <div className="flex min-h-fit w-full items-center gap-8 px-12 pb-8">
            <div className="font-bold">{"Pool"}</div>
            <div className="mx-1 grow overflow-hidden px-1">
              <SearchInput onChange={setSearch} placeholder={t("Search by name")} />
            </div>
          </div>
          <ScrollContainer className=" bg-black-secondary border-grey-700 scrollable h-full w-full grow overflow-x-hidden border-t">
            {pools.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-8">
                <div className="flex items-center gap-4">
                  <div className="text-body">
                    {p.name} {p.id === pool?.id && "selected"})
                  </div>
                </div>
                <IconButton onClick={() => handleSelect(p.id)}>
                  <ChevronRightIcon />
                </IconButton>
              </div>
            ))}
            {/* <InlineStakingAccountsList
              accounts={accounts}
              genesisHash={chain?.genesisHash}
              selected={account?.address}
              onSelect={handleSelect}
              showBalances
              tokenId={token?.id}
              showIfEmpty
            /> */}
          </ScrollContainer>
        </div>
      </div>
    </Modal>
  )
}
