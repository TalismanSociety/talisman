import { CodeBlock } from "@talisman/components/CodeBlock"
import { classNames } from "@talisman/util/classNames"
import { dump as convertToYaml } from "js-yaml"
import { FC, useMemo, useState } from "react"

import { ViewDetailsField } from "./ViewDetailsField"

type ArgsLabelProps = {
  label: string
  displayAsJson: boolean
  setDisplayAsJson: (json: boolean) => void
}

const ArgsLabel: FC<ArgsLabelProps> = ({ label, displayAsJson, setDisplayAsJson }) => {
  return (
    <div>
      {label} as :{" "}
      <span
        onClick={() => setDisplayAsJson(false)}
        className={classNames("decode-mode", !displayAsJson && "decode-mode-active")}
      >
        YAML
      </span>{" "}
      /{" "}
      <span
        onClick={() => setDisplayAsJson(true)}
        className={classNames("decode-mode", displayAsJson && "decode-mode-active")}
      >
        JSON
      </span>
    </div>
  )
}

type ViewDetailsTxArgsProps = {
  label: string
  args?: any
}

export const ViewDetailsTxArgs: FC<ViewDetailsTxArgsProps> = ({ label, args }) => {
  const [displayAsJson, setDisplayAsJson] = useState(false)

  const code = useMemo(() => {
    if (!args) return ""
    if (displayAsJson) return JSON.stringify(args, null, 2)
    else return convertToYaml(args)
  }, [args, displayAsJson])

  if (!code) return null

  return (
    <ViewDetailsField
      label={
        <ArgsLabel
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
