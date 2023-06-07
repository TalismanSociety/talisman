import { Balances } from "@core/domains/balances/types"
import { AccountJson } from "@polkadot/extension-base/background/types"
import { WithTooltip } from "@talisman/components/Tooltip"
import { LinkIcon, PolkadotVaultIcon, UsbIcon } from "@talisman/theme/icons"
import { ReactComponent as IconCopy } from "@talisman/theme/icons/copy.svg"
import { ReactComponent as IconLoader } from "@talisman/theme/icons/loader.svg"
import Asset from "@ui/domains/Asset"
import { useAnalytics } from "@ui/hooks/useAnalytics"
import { FC, useCallback } from "react"
import { useTranslation } from "react-i18next"
import styled from "styled-components"

import { useCopyAddressModal } from "../CopyAddress"
import Avatar from "./Avatar"

type AccountTypeIconProps = {
  origin?: AccountJson["origin"] | null
  linked?: boolean
  className?: string
}

export const AccountTypeIcon: FC<AccountTypeIconProps> = ({ origin, linked, className }) => {
  const { t } = useTranslation()

  if (linked && ["SEED", "JSON"].includes(origin as string))
    return (
      <WithTooltip
        as="div"
        className={`${className} source`}
        tooltip={t("{{origin}} Import", { origin })}
      >
        <LinkIcon />
      </WithTooltip>
    )
  if (origin === "HARDWARE")
    return (
      <WithTooltip
        as="div"
        className={`${className} source`}
        tooltip={t("{{origin}} Import", { origin })}
      >
        <UsbIcon />
      </WithTooltip>
    )
  if (origin === "QR")
    return (
      <WithTooltip
        as="div"
        className={`${className} source`}
        tooltip={t("{{origin}} Import", { origin })}
      >
        <PolkadotVaultIcon />
      </WithTooltip>
    )
  return null
}

export interface NamedAddressOptions {
  withAvatar?: boolean
  withBalanceRow?: boolean
  withCopy?: boolean
  withSource?: boolean
  withBackupIndicator?: boolean
}

export interface NamedAddressProps
  extends NamedAddressOptions,
    Pick<AccountJson, "address" | "name" | "genesisHash"> {
  balances?: Balances
  className?: string
}

const NamedAddress = ({
  address,
  name,
  genesisHash,
  balances,
  withAvatar,
  withBalanceRow,
  withCopy,
  withSource,
  className,
}: NamedAddressProps) => {
  const { genericEvent } = useAnalytics()
  const { open } = useCopyAddressModal()
  const handleCopyClick = useCallback(() => {
    open({
      mode: "copy",
      address,
    })
    genericEvent("open copy address")
  }, [address, genericEvent, open])

  return (
    <>
      <span className={`${className} account-name`}>
        {!!withAvatar && <Avatar address={address} genesisHash={genesisHash} />}
        <div className={`text${withBalanceRow ? " light" : ""}`}>
          <span className="account-name-row">
            <span className="name">{name ?? address}</span>
            <span className="copy">
              {withCopy && (
                <IconCopy onClick={handleCopyClick} className={`${className} copyIcon`} />
              )}
            </span>
          </span>
          {!!withBalanceRow && balances && (
            <span className="balance">
              {balances.count > 0 ? (
                <Asset.Fiat
                  amount={balances.sum.fiat("usd").transferable}
                  currency="usd"
                  isBalance
                />
              ) : (
                <IconLoader className="animate-spin-slow" />
              )}
            </span>
          )}
        </div>
      </span>
      {!!withSource && <AccountTypeIcon linked origin={origin} className={className} />}
    </>
  )
}

const StyledNamedAddress = styled(NamedAddress)`
  display: flex;
  align-items: center;
  max-width: 100%;
  overflow: hidden;

  > .account-avatar {
    margin-right: 1rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  > .text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    flex-direction: column;

    > .account-name-row {
      font-size: var(--font-size-medium);
      color: var(--color-mid);
      line-height: 1.4;
      display: inline-flex;

      .name {
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }

      > div {
        line-height: inherit;
      }

      .copy {
        margin-left: 0.8rem;
        width: 1.8rem;
        min-width: 1.8rem;
        display: flex;
        flex-direction: column;
        justify-content: center;

        .copyIcon {
          font-size: 1.4rem;
          color: var(--color-mid);
          transition: all var(--transition-speed-fast) ease-in-out;
        }
        &:hover .copyIcon {
          color: var(--color-foreground);
        }
      }
    }

    > .balance {
      font-size: var(--font-size-xsmall);
      color: var(--color-mid);
      line-height: 1.4;
      height: 1.5rem; // force to prevent flickering

      span {
        font-size: var(--font-size-xsmall);
        line-height: inherit;
      }

      .balance-revealable {
        width: 5rem;
      }
    }
  }

  &.source {
    margin-left: 1rem;
    color: var(--color-primary);
    font-size: var(--font-size-small);
    cursor: auto;

    svg {
      display: block;
    }
  }

  > .backup {
    margin-left: 1rem;
  }
`

export default StyledNamedAddress
