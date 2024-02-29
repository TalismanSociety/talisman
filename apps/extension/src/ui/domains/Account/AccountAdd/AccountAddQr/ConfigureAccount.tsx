import { HeaderBlock } from "@talisman/components/HeaderBlock"
import { ArrowRightIcon, LoaderIcon, PolkadotVaultIcon } from "@talismn/icons"
import { AccountIcon } from "@ui/domains/Account/AccountIcon"
import { Address } from "@ui/domains/Account/Address"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { Fiat } from "@ui/domains/Asset/Fiat"
import { useBalanceDetails } from "@ui/hooks/useBalanceDetails"
import { useBalancesByParams } from "@ui/hooks/useBalancesByParams"
import { useChainByGenesisHash } from "@ui/hooks/useChainByGenesisHash"
import useChains from "@ui/hooks/useChains"
import { useSetting } from "@ui/hooks/useSettings"
import { useMemo } from "react"
import { Trans, useTranslation } from "react-i18next"
import {
  Button,
  Checkbox,
  FormFieldInputText,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "talisman-ui"

import { useAccountAddQr } from "./context"

export const ConfigureAccount = () => {
  const { t } = useTranslation("admin")
  const { state, dispatch, submitConfigure } = useAccountAddQr()

  const [includeTestnets] = useSetting("useTestnets")
  const { chains } = useChains({ activeOnly: true, includeTestnets })
  const addressesByChain = useMemo(() => {
    if (state.type !== "CONFIGURE") return

    const { address, genesisHash, lockToNetwork } = state.accountConfig
    const filteredChains = lockToNetwork
      ? chains.filter((chain) => chain.genesisHash === genesisHash)
      : chains

    return Object.fromEntries(filteredChains.map(({ id }) => [id, [address]]))
  }, [chains, state])
  const balances = useBalancesByParams({ addressesByChain })
  const chain = useChainByGenesisHash(
    (state.type === "CONFIGURE" && state.accountConfig.genesisHash) || undefined
  )

  const isBalanceLoading =
    !addressesByChain ||
    balances.sorted.length < 1 ||
    balances.sorted.some((b) => b.status !== "live")
  const { balanceDetails, totalUsd } = useBalanceDetails(balances)

  if (state.type !== "CONFIGURE") return null

  const { accountConfig } = state

  return (
    <>
      <HeaderBlock
        className="mb-12"
        title={t("Name your account")}
        text={t(
          "Help distinguish your account by giving it a name. This would ideally be the same as the name on your Polkadot Vault device to make it easy to identify when signing."
        )}
      />
      <form className="my-20 space-y-10" onSubmit={submitConfigure}>
        <FormFieldInputText
          type="text"
          placeholder={t("My Polkadot Vault Account")}
          containerProps={{ className: "!h-28" }}
          small
          value={accountConfig.name}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onChange={(event) => dispatch({ method: "setName", name: event.target.value })}
        />

        <div className="ring-grey-700 flex w-full items-center gap-8 overflow-hidden rounded-sm p-8 text-left ring-1">
          <AccountIcon
            address={accountConfig.address}
            genesisHash={accountConfig.lockToNetwork ? accountConfig.genesisHash : undefined}
            className="text-xl"
          />
          <div className="flex flex-col !items-start gap-2 overflow-hidden leading-8">
            <div className="text-body flex w-full items-center gap-3 text-base leading-none">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base leading-8">
                {accountConfig.name || t("My Polkadot Vault Account")}
              </div>
              <div>
                <PolkadotVaultIcon className="text-primary" />
              </div>
            </div>
            <div className="text-body-secondary overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-7">
              <Address address={accountConfig.address} />
            </div>
          </div>
          <div className="grow" />
          <div className="flex items-center justify-end gap-2">
            <div className="flex flex-col justify-center pb-1 leading-none">
              {isBalanceLoading && <LoaderIcon className="animate-spin-slow inline text-white" />}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Fiat amount={totalUsd} isBalance />
                </div>
              </TooltipTrigger>
              {balanceDetails && (
                <TooltipContent>
                  <div className="leading-paragraph whitespace-pre text-right">
                    {balanceDetails}
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {!!chain && (
          <Checkbox
            checked={accountConfig.lockToNetwork}
            onChange={(event) =>
              dispatch({ method: "setLockToNetwork", lockToNetwork: event.target.checked })
            }
          >
            <span className="text-body-secondary inline-flex items-center gap-2">
              <Trans t={t}>
                <span>Restrict account to </span>
                <ChainLogo id={chain.id} className="inline" />
                <span className="text-body">{chain.name}</span>
                <span>network</span>
              </Trans>
            </span>
          </Checkbox>
        )}

        <div className="flex justify-end py-8">
          <Button icon={ArrowRightIcon} type="submit" primary processing={state.submitting}>
            {t("Import")}
          </Button>
        </div>
      </form>
    </>
  )
}
