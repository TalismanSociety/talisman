import { Token, TokenId } from "@talismn/chaindata-provider"
import { PlusIcon } from "@talismn/icons"
import { TokenRatesList } from "@talismn/token-rates"
import { FC, useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Drawer, useOpenClose } from "talisman-ui"

import { useChain, useEvmNetwork } from "@ui/state"

import { TokenLogo } from "../../TokenLogo"
import { RampTokenPicker } from "./RampTokenPicker"

export const RampTokenPickerButton: FC<{
  value: TokenId | undefined
  tokens: Token[] | undefined
  tokenRates: TokenRatesList | null | undefined
  onSelect: (tokenId: string) => void
}> = ({ value, tokens, tokenRates, onSelect }) => {
  const [selected, setSelected] = useState(value)
  const { open, close, isOpen } = useOpenClose()

  const token = useMemo(() => tokens?.find((t) => t.id === value), [tokens, value])

  const handleOpen = useCallback(() => {
    setSelected(value)
    open()
  }, [open, value])

  const handleSelect = useCallback(
    (currency: string) => {
      onSelect(currency)
      close()
    },
    [close, onSelect],
  )

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={
          "border-grey-750 bg-grey-800 flex h-full w-[14rem] items-center gap-4 rounded-[12px] px-4 py-3"
        }
      >
        {token ? <TokenContent token={token} /> : <EmptyContent />}
      </button>
      <Drawer
        anchor="right"
        isOpen={isOpen}
        containerId="ramp-container"
        className="size-full bg-black"
      >
        <RampTokenPicker
          selected={selected}
          tokens={tokens}
          tokenRates={tokenRates}
          onClose={close}
          onSelect={handleSelect}
        />
      </Drawer>
    </>
  )
}

const TokenContent: FC<{ token: Token }> = ({ token }) => {
  const evmNetwork = useEvmNetwork(token.evmNetwork?.id)
  const dotNetwork = useChain(token.chain?.id)

  return (
    <div className="flex items-center gap-4 truncate text-left">
      <div className="flex-shrink-0">
        <TokenLogo tokenId={token.id} className="size-14 shrink-0" />
      </div>
      <div className="min-w-0 text-[16px]">
        <div className="text-white">{token.symbol}</div>
        <div className="text-tiny truncate">{evmNetwork?.name ?? dotNetwork?.name ?? null}</div>
      </div>
    </div>
  )
}

const EmptyContent: FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex w-full items-center gap-3">
      <div className="flex items-center justify-center rounded-full bg-[#D5FF5C] bg-opacity-10">
        <PlusIcon className="text-primary-500 m-[0.3rem] size-10" />
      </div>
      <div className="text-xs text-white">{t("Select token")}</div>
    </div>
  )
}
