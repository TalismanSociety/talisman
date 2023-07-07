import { CodeBlock } from "@talisman/components/CodeBlock"
import { classNames } from "@talismn/util"
import { dump as convertToYaml } from "js-yaml"
import { FC, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { ViewDetailsField } from "./ViewDetailsField"

type ObjectLabelProps = {
  label: string
  displayAsJson: boolean
  setDisplayAsJson: (json: boolean) => void
}

const ObjectLabel: FC<ObjectLabelProps> = ({ label, displayAsJson, setDisplayAsJson }) => {
  const { t } = useTranslation("request")
  return (
    <div>
      {t("{{label}} as :", { label })}{" "}
      <button
        type="button"
        onClick={() => setDisplayAsJson(false)}
        className={classNames(
          "cursor-pointer",
          !displayAsJson ? "text-body" : "hover:text-grey-300 underline"
        )}
      >
        YAML
      </button>{" "}
      /{" "}
      <button
        type="button"
        onClick={() => setDisplayAsJson(true)}
        className={classNames(
          "cursor-pointer",
          displayAsJson ? "text-body" : "hover:text-grey-300 underline"
        )}
      >
        JSON
      </button>
    </div>
  )
}

type ViewDetailsTxObjectProps = {
  label: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj?: any
}

export const ViewDetailsTxObject: FC<ViewDetailsTxObjectProps> = ({ label, obj }) => {
  const [displayAsJson, setDisplayAsJson] = useState(false)

  const code = useMemo(() => {
    if (!obj) return ""
    if (displayAsJson) return JSON.stringify(obj, null, 2)
    return convertToYaml(obj)
  }, [obj, displayAsJson])

  if (!code) return null

  return (
    <ViewDetailsField
      label={
        <ObjectLabel
          label={label}
          displayAsJson={displayAsJson}
          setDisplayAsJson={setDisplayAsJson}
        />
      }
    >
      <CodeBlock className="mt-2" code={code} />
    </ViewDetailsField>
  )
}
