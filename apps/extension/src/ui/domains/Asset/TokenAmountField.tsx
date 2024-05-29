import { useOpenClose } from "@talisman/hooks/useOpenClose"
import { Token } from "@talismn/chaindata-provider"
import { ChevronRightIcon, XIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import useToken from "@ui/hooks/useToken"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { Modal } from "talisman-ui"

import { TokenLogo } from "./TokenLogo"
import { TokenPicker } from "./TokenPicker"

type TokenAmountFieldProps = {
  fieldProps: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>
} & {
  prefix?: string
  tokenId?: string
  address?: string
  onTokenChanged?: (tokenId: string) => void
  tokensFilter?: (token: Token) => boolean
  onTokenButtonClick?: () => void // use for analytics only
}

/*
  amount is uncontrolled
  tokenId is controlled so it can be changed by parent
**/
export const TokenAmountField = ({
  prefix,
  tokenId,
  address,
  onTokenChanged,
  onTokenButtonClick,
  fieldProps,
  tokensFilter,
}: TokenAmountFieldProps) => {
  const { t } = useTranslation("common")
  const { open, isOpen, close } = useOpenClose()
  const token = useToken(tokenId)

  const handleTokenSelect = useCallback(
    (id: string) => {
      onTokenChanged?.(id)
      close()
    },
    [close, onTokenChanged]
  )

  const handleTokenButtonClick = useCallback(() => {
    onTokenButtonClick?.()
    open()
  }, [onTokenButtonClick, open])

  return (
    <>
      <div
        className={classNames("bg-grey-800 flex h-36 flex-row-reverse items-center rounded-sm p-8")}
      >
        {/* CSS trick here we need prefix to be after input to have a valid CSS rule for prefix color change base on input beeing empty
        items will be displayed in reverse order to make this workaround possible */}
        <button
          type="button"
          onClick={handleTokenButtonClick}
          className={classNames(
            "bg-primary/10 text-primary flex h-20 shrink-0 items-center whitespace-nowrap rounded-sm px-4 text-sm opacity-80 hover:opacity-100",
            token && "!bg-grey-750 !text-body-secondary hover:!bg-grey-700 gap-4 !text-base"
          )}
        >
          {token ? (
            <>
              <TokenLogo tokenId={tokenId} className="inline-block text-lg" /> {token.symbol}
            </>
          ) : (
            <>
              Choose Token <ChevronRightIcon className="inline-block text-base" />
            </>
          )}
        </button>
        <input
          type="number"
          inputMode="decimal"
          placeholder="100"
          autoComplete="off"
          {...fieldProps}
          className={classNames(
            "text-secondary peer min-w-0 appearance-none border-none bg-transparent text-xl leading-none"
          )}
        />
        {!!prefix && (
          <span className={classNames("prefix peer-placeholder-shown:text-body-disabled text-xl")}>
            {prefix}
          </span>
        )}
      </div>
      <Modal isOpen={isOpen} onDismiss={close}>
        <div className=" text-body-secondary bg-grey-850 border-grey-800 flex h-[50rem] w-[42rem] flex-col overflow-hidden rounded border">
          <div className="flex w-full items-center p-10">
            <div className="w-12"></div>
            <div className="flex-grow text-center">{t("Select a token")}</div>
            <button className="hover:text-body text-lg" onClick={close}>
              <XIcon />
            </button>
          </div>
          <TokenPicker
            className="[&>section]:bg-grey-800 flex-grow"
            address={address}
            onSelect={handleTokenSelect}
            ownedOnly
            showEmptyBalances
            tokenFilter={tokensFilter}
          />
        </div>
      </Modal>
    </>
  )
}
