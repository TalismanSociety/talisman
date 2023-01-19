import { SwapIcon, XIcon } from "@talisman/theme/icons"
import { shortenAddress } from "@talisman/util/shortenAddress"
import { SendFundsWizardPage, useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import useToken from "@ui/hooks/useToken"
import { DetailedHTMLProps, FC, useCallback, useMemo, useState } from "react"
import { Container } from "react-dom"
import { Button, PillButton, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"
import { ChainLogo } from "../Asset/ChainLogo"
import { TokenLogo } from "../Asset/TokenLogo"

type ContainerProps = DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>

const Container: FC<ContainerProps> = (props) => {
  return (
    <div
      {...props}
      className={classNames("bg-grey-900 text-body-secondary rounded", props.className)}
    ></div>
  )
}

type AddressPillButtonProps = { address?: string | null; className?: string; onClick?: () => void }

const AddressPillButton: FC<AddressPillButtonProps> = ({ address, className, onClick }) => {
  const account = useAccountByAddress(address as string)

  // TODO lookup contacts

  const { name, genesisHash } = useMemo(
    () => account ?? { name: undefined, genesisHash: undefined },
    [account]
  )

  if (!address) return null

  return (
    <PillButton className={classNames("h-16 !py-2 !px-4", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div>
          <AccountAvatar className="!text-lg" address={address} genesisHash={genesisHash} />
        </div>
        <div>{name ?? shortenAddress(address)}</div>
      </div>
    </PillButton>
  )
}

type TokenPillButtonProps = { tokenId?: string | null; className?: string; onClick?: () => void }

const TokenPillButton: FC<TokenPillButtonProps> = ({ tokenId, className, onClick }) => {
  const token = useToken(tokenId as string)

  if (!tokenId || !token) return null

  return (
    <PillButton className={classNames("h-16 !py-2 !px-4", className)} onClick={onClick}>
      <div className="text-body flex  flex-nowrap items-center gap-4 text-base">
        <div>
          <TokenLogo className="!text-lg" tokenId={tokenId} />
        </div>
        <div>{token.symbol}</div>
      </div>
    </PillButton>
  )
}

export const SendFundsMainForm = () => {
  const { from, to, tokenId, goto } = useSendFunds()
  const [isTokenEdit, setIsTokenEdit] = useState(true)

  const toggleIsTokenEdit = useCallback(() => {
    setIsTokenEdit((prev) => !prev)
  }, [])

  const handleGotoClick = useCallback(
    (page: SendFundsWizardPage) => () => {
      goto(page)
    },
    [goto]
  )

  return (
    <div className="flex h-full w-full flex-col px-12 pb-8">
      <Container className="flex h-[9rem] w-full flex-col justify-center gap-5 px-8">
        <div className="flex w-full justify-between">
          <div>From</div>
          <div>
            <AddressPillButton address={from} onClick={handleGotoClick("from")} />
          </div>
        </div>
        <div className="flex w-full justify-between">
          <div>To</div>
          <div>
            <AddressPillButton address={to} onClick={handleGotoClick("to")} />
          </div>
        </div>
      </Container>
      <div className="w-full grow">
        <div className="flex h-[13.1rem] flex-col justify-end text-xl font-bold">
          {isTokenEdit ? "552 ASTR" : "435 $"}
        </div>
        <div className="mt-4 flex gap-6">
          <div className="text-body-secondary w-[50%] shrink-0 text-right text-sm">
            {!isTokenEdit ? "552 ASTR" : "435 $"}
          </div>
          <PillButton
            onClick={toggleIsTokenEdit}
            size="xs"
            className="h-[2.2rem] w-[2.2rem] rounded-full px-0 py-0"
          >
            <SwapIcon />
          </PillButton>
          <PillButton size="xs" className="h-[2.2rem] rounded-sm py-0 px-4">
            Max
          </PillButton>
        </div>
      </div>
      <div className="w-full space-y-4 text-xs leading-[140%]">
        <Container className="flex w-full justify-between px-6 py-4">
          <div>
            <TokenPillButton tokenId={tokenId} onClick={handleGotoClick("token")} />
          </div>
          <div className="text-right ">
            <div>90.00 DOT</div>
            <div className="text-body-disabled">420.69 $</div>
          </div>
        </Container>
        <Container className="flex w-full justify-between px-8 py-4">
          <div>Network</div>
          <div className="flex items-center gap-2">
            <ChainLogo className="inline-block text-base" />
            <div>Polkadot</div>
          </div>
        </Container>
        <Container className="flex w-full justify-between px-8 py-4">
          <div>Estimated Fee</div>
          <div>&gt;0.001 DOT</div>
        </Container>
      </div>
      <Button primary className="mt-8 w-full" disabled>
        Review
      </Button>
    </div>
  )
}
