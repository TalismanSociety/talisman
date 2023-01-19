import { shortenAddress } from "@talisman/util/shortenAddress"
import { useSendFunds } from "@ui/apps/popup/pages/SendFunds/context"
import useAccountByAddress from "@ui/hooks/useAccountByAddress"
import { DetailedHTMLProps, FC, useMemo } from "react"
import { Container } from "react-dom"
import { Button, PillButton, classNames } from "talisman-ui"

import AccountAvatar from "../Account/Avatar"

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
    <PillButton className={classNames("!py-2 !px-4", className)} onClick={onClick}>
      <div className="text-body flex flex-nowrap items-center gap-4 text-base">
        <div>
          <AccountAvatar className="!text-lg" address={address} genesisHash={genesisHash} />
        </div>
        <div>{name ?? shortenAddress(address)}</div>
      </div>
    </PillButton>
  )
}

export const SendFundsMainForm = () => {
  const { from, to } = useSendFunds()

  return (
    <div className="flex h-full w-full flex-col px-12 pb-8">
      <Container className="flex h-[9rem] w-full flex-col justify-center gap-2 px-8">
        <div className="flex w-full justify-between">
          <div>From</div>
          <div>
            <AddressPillButton address={from} />
          </div>
        </div>
        <div className="flex w-full justify-between">
          <div>To</div>
          <div>
            <AddressPillButton address={to} />
          </div>
        </div>
      </Container>
      <div className="w-full grow"></div>
      <div className="w-full space-y-4">
        <Container className="flex w-full justify-between">
          <div>DOT</div>
          <div>90.00 DOT</div>
        </Container>
        <Container className="flex w-full justify-between">
          <div>Network</div>
          <div>Polkadot</div>
        </Container>
        <Container className="flex w-full justify-between">
          <div>Estimated Fee</div>
          <div>&gt;0.001 DOT</div>
        </Container>
      </div>
      <Button primary className="mt-8 w-full">
        Review
      </Button>
    </div>
  )
}
