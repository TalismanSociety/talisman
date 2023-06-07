import HeaderBlock from "@talisman/components/HeaderBlock"
import { SimpleButton } from "@talisman/components/SimpleButton"
import { WithTooltip } from "@talisman/components/Tooltip"
import { ArrowRightIcon, LoaderIcon, PolkadotVaultIcon } from "@talisman/theme/icons"
import { Address } from "@ui/domains/Account/Address"
import Avatar from "@ui/domains/Account/Avatar"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import Fiat from "@ui/domains/Asset/Fiat"
import { useBalanceDetails } from "@ui/hooks/useBalanceDetails"
import useBalancesByParams from "@ui/hooks/useBalancesByParams"
import useChainByGenesisHash from "@ui/hooks/useChainByGenesisHash"
import useChains from "@ui/hooks/useChains"
import { useSetting } from "@ui/hooks/useSettings"
import { useMemo } from "react"
import { Checkbox, FormFieldInputText } from "talisman-ui"

import { useAccountAddQr } from "./context"

export const ConfigureAccount = () => {
  const { state, dispatch, submitConfigure } = useAccountAddQr()

  const [useTestnets] = useSetting("useTestnets")
  const { chains } = useChains(useTestnets)
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
        title="Name your account"
        text="Help distinguish your account by giving it a name. This would ideally be the same as the name on your Polkadot Vault device to make it easy to identify when signing."
      />
      <form className="my-20 space-y-10" onSubmit={submitConfigure}>
        <FormFieldInputText
          type="text"
          placeholder="My Polkadot Vault Account"
          containerProps={{ className: "!h-28" }}
          small
          value={accountConfig.name}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          onChange={(event) => dispatch({ method: "setName", name: event.target.value })}
        />

        <div className="ring-grey-700 flex w-full items-center gap-8 overflow-hidden rounded-sm p-8 text-left ring-1">
          <Avatar
            address={accountConfig.address}
            genesisHash={accountConfig.lockToNetwork ? accountConfig.genesisHash : undefined}
          />
          <div className="flex flex-col !items-start gap-2 overflow-hidden leading-8">
            <div className="text-body flex w-full items-center gap-3 text-base leading-none">
              <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base leading-8">
                {accountConfig.name || "My Polkadot Vault Account"}
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
            <WithTooltip as="div" className="leading-none" tooltip={balanceDetails} noWrap>
              <Fiat className="leading-none" amount={totalUsd} currency="usd" />
            </WithTooltip>
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
              <span>Restrict account to </span>
              <ChainLogo id={chain.id} className="inline" />
              <span className="text-body">{chain.name}</span>
              <span>network</span>
            </span>
          </Checkbox>
        )}

        <div className="flex justify-end py-8">
          <SimpleButton type="submit" primary processing={state.submitting}>
            Import <ArrowRightIcon />
          </SimpleButton>
        </div>
      </form>
    </>
  )
}
