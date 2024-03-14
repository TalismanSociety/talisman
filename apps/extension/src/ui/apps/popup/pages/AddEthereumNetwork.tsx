import { KnownRequestIdOnly } from "@extension/core"
import { log } from "@extension/shared"
import { AppPill } from "@talisman/components/AppPill"
import { notify } from "@talisman/components/Notifications"
import { EvmNetwork } from "@talismn/chaindata-provider"
import { GlobeIcon, InfoIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { api } from "@ui/api"
import { balancesHydrateAtom } from "@ui/atoms"
import { ChainLogo } from "@ui/domains/Asset/ChainLogo"
import { NetworkDetailsButton, NetworkDetailsLink } from "@ui/domains/Ethereum/NetworkDetailsButton"
import { useEvmNetwork } from "@ui/hooks/useEvmNetwork"
import { useRequest } from "@ui/hooks/useRequest"
import { requestsAtom } from "@ui/hooks/useRequests"
import useToken from "@ui/hooks/useToken"
import { atom, useAtomValue } from "jotai"
import { ChangeEventHandler, FC, ReactNode, useCallback, useMemo, useState } from "react"
import { Trans, useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "talisman-ui"
import { AddEthereumChainParameter, isHex, toHex } from "viem"

import { PopupContent, PopupFooter, PopupHeader, PopupLayout } from "../Layout/PopupLayout"

// TODO once finalized with Diogo, convert as style.css classes, then move to talisman-ui along with a test page in playground
const Radio: FC<{
  name: string
  value: string
  label?: ReactNode
  checked?: boolean
  onChange?: ChangeEventHandler<HTMLInputElement>
  className?: string
}> = ({ name, value, label, checked, className, onChange }) => {
  return (
    <label
      className={classNames(
        "cursor-pointer p-0.5",
        "hover:text-grey-300",
        "has-[:checked]:text-body has-[:checked]:cursor-default",
        className
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className={classNames(
          "bg-body-disabled h-[0.8em] w-[0.8em] appearance-none rounded-full",
          "checked:bg-primary checked:border-body-disabled checked:border-[0.15em]",
          "ring-body focus-visible:ring-1"
        )}
      />
      {!!label && <span className="ml-3">{label}</span>}
    </label>
  )
}

type SettingsSource = "talisman" | "dapp"

const SettingsSourceSelector: FC<{
  source: SettingsSource
  onChange: (src: SettingsSource) => void
  network: AddEthereumChainParameter
  knownNetwork: EvmNetwork
}> = ({ source, onChange, network, knownNetwork }) => {
  const { t } = useTranslation("request")
  const knownNativeToken = useToken(knownNetwork.nativeToken?.id)

  const handleOptionChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      onChange(e.target.value as SettingsSource)
    },
    [onChange]
  )

  const knownNetworkDetails = useMemo<AddEthereumChainParameter | null>(() => {
    if (!knownNetwork || !knownNativeToken) return null

    return {
      chainName: knownNetwork.name ?? "N/A",
      rpcUrls: knownNetwork.rpcs?.map((rpc) => rpc.url) ?? [],
      chainId: toHex(Number(knownNetwork.id)),
      nativeCurrency: {
        name: knownNativeToken.symbol,
        symbol: knownNativeToken.symbol,
        decimals: knownNativeToken.decimals,
      },
      blockExplorerUrls: knownNetwork.explorerUrl ? [knownNetwork.explorerUrl] : [],
      iconUrls: [],
    }
  }, [knownNativeToken, knownNetwork])

  if (!knownNetworkDetails) return null

  return (
    <div className="text-body-secondary bg-grey-800 w-full rounded-sm p-4 text-left text-sm">
      <fieldset>
        <legend className="mb-2 flex items-center gap-2">
          <span>{t("Choose network settings source")}</span>
          <Tooltip>
            <TooltipTrigger>
              <InfoIcon />
            </TooltipTrigger>
            <TooltipContent>
              {t("This network's settings can be modified afterwards from Talisman settings menu")}
            </TooltipContent>
          </Tooltip>
        </legend>
        <div className="flex justify-between">
          <Radio
            name="settings-source"
            value="talisman"
            label={t("Talisman settings")}
            checked={source === "talisman"}
            onChange={handleOptionChange}
          />
          <NetworkDetailsLink
            network={knownNetworkDetails}
            label={t("Review")}
            title={"Talisman settings"}
          />
        </div>
        <div className="flex justify-between">
          <Radio
            name="settings-source"
            value="dapp"
            label={t("App provided settings")}
            checked={source === "dapp"}
            onChange={handleOptionChange}
          />
          <NetworkDetailsLink
            network={network}
            label={t("Review")}
            title={"App provided settings"}
          />
        </div>
      </fieldset>
    </div>
  )
}

const preloadAtom = atom((get) => Promise.all([get(balancesHydrateAtom), get(requestsAtom)]))

export const AddEthereumNetwork = () => {
  const { t } = useTranslation("request")
  useAtomValue(preloadAtom)
  const { id } = useParams<"id">() as KnownRequestIdOnly<"eth-network-add">
  const request = useRequest(id)

  const evmNetworkId = useMemo(() => {
    try {
      return request?.network.chainId && isHex(request.network.chainId)
        ? parseInt(request.network.chainId, 16).toString()
        : undefined
    } catch (err) {
      log.error("Failed to parse chainId", { request })
      return undefined
    }
  }, [request])

  const knownNetwork = useEvmNetwork(evmNetworkId)
  const knownNativeToken = useToken(knownNetwork?.nativeToken?.id)
  // checking native token availability handles edge cases
  const canEnableDefault = useMemo(() => !!knownNativeToken, [knownNativeToken])

  // set initial value based on known network existence
  const [source, setSource] = useState<SettingsSource>(() => (knownNetwork ? "talisman" : "dapp"))

  const enableDefault = useMemo(() => {
    return canEnableDefault && source === "talisman"
  }, [canEnableDefault, source])

  const approve = useCallback(async () => {
    if (!request) return
    try {
      await api.ethNetworkAddApprove(request.id, enableDefault)
      window.close()
    } catch (err) {
      notify({ type: "error", title: t("Failed to add network"), subtitle: (err as Error).message })
    }
  }, [enableDefault, request, t])

  const cancel = useCallback(() => {
    if (!request) return
    api.ethNetworkAddCancel(request.id)
    window.close()
  }, [request])

  const chainName = useMemo(() => {
    return knownNetwork && source === "talisman" ? knownNetwork.name : request?.network.chainName
  }, [knownNetwork, request?.network.chainName, source])

  if (!request) return null

  return (
    <PopupLayout>
      <PopupHeader>
        <AppPill url={request.url} />
      </PopupHeader>
      <PopupContent>
        <div className="flex h-full w-full flex-col items-center text-center">
          {enableDefault && knownNetwork ? (
            <ChainLogo id={knownNetwork.id} className="mt-6 inline-block text-3xl" />
          ) : (
            <GlobeIcon className="globeIcon text-primary mt-6 inline-block text-3xl" />
          )}
          <h1 className="text-md mb-12 mt-8 font-bold">{t("Add Network")}</h1>
          <p className="text-body-secondary leading-[2.6rem]">
            <Trans t={t}>
              This app wants to connect Talisman to the{" "}
              <span className="bg-grey-850 text-body inline-block h-[2.6rem] items-center rounded-3xl px-3 font-light">
                {chainName}
              </span>{" "}
              network.
            </Trans>
          </p>
          {!canEnableDefault && (
            <div className="mt-16">
              <NetworkDetailsButton network={request.network} />
            </div>
          )}
          <div className="grow"></div>
          {canEnableDefault && !!knownNetwork && (
            <SettingsSourceSelector
              source={source}
              onChange={setSource}
              network={request.network}
              knownNetwork={knownNetwork}
            />
          )}
        </div>
      </PopupContent>
      <PopupFooter>
        <div className="grid w-full grid-cols-2 gap-8">
          <Button onClick={cancel}>{t("Reject")}</Button>
          <Button primary onClick={approve}>
            {t("Approve")}
          </Button>
        </div>
      </PopupFooter>
    </PopupLayout>
  )
}
