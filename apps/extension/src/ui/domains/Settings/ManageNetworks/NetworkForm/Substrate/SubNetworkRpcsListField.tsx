import { FC, useCallback, useRef, useState } from "react"
import { FieldPathValue, useFormContext } from "react-hook-form"
import { useTranslation } from "react-i18next"

import {
  NetworkRpcsListField,
  SortableRpcField,
  SortableRpcItemProps,
} from "../NetworkRpcsListField"
import { getSubstrateRpcInfo, wsRegEx } from "./helpers"
import { SubNetworkFormData } from "./types"

const SubSortableRpcField: FC<SortableRpcItemProps> = (props) => {
  const [fetchingGenesisHash, setFetchingGenesisHash] = useState(false)
  const { t } = useTranslation()
  const { index } = props
  const { setError, setValue } = useFormContext<SubNetworkFormData>()

  const latestRequestRef = useRef(0)
  const getGenesisHash = useCallback(
    async (
      name: `rpcs.${number}.url`,
      value: FieldPathValue<SubNetworkFormData, `rpcs.${number}.url`>
    ) => {
      await (async () => {
        try {
          if (!value) return

          setFetchingGenesisHash(true)
          const refId = latestRequestRef.current + 1
          latestRequestRef.current = refId

          if (!wsRegEx.test(value)) return setError(name, { message: t("Invalid URL") })

          const rpcInfo = await getSubstrateRpcInfo(value)
          // Failed connections take longer to return than successful ones, so
          // we compare current ref to the one used for this method call,
          // and no-op if it has changed to prevent race condition where bad result clobbers good one
          if (latestRequestRef.current !== refId) return
          if (!rpcInfo?.genesisHash) {
            return setError(name, { message: t("Failed to connect") })
          }
          setValue(`rpcs.${index}.genesisHash`, rpcInfo.genesisHash)
        } catch (error) {
          return setError(name, { message: t("Failed to connect") })
        }
      })()
      setFetchingGenesisHash(false)
    },
    [index, setError, setValue, t]
  )

  return (
    <SortableRpcField
      isLoading={fetchingGenesisHash}
      extraValidationCb={getGenesisHash}
      {...props}
    />
  )
}

export const SubNetworkRpcsListField = () => {
  return <NetworkRpcsListField placeholder="wss://" FieldComponent={SubSortableRpcField} />
}
