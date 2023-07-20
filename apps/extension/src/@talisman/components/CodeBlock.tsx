import { classNames } from "@talismn/util"
import hljs from "highlight.js/lib/core"
import json from "highlight.js/lib/languages/json"
import yaml from "highlight.js/lib/languages/yaml"
import htmlParser from "html-react-parser"
import { useMemo } from "react"

// only support yaml and json, prevents importing all languages which makes the bundle size huge
hljs.registerLanguage("yaml", yaml)
hljs.registerLanguage("json", json)

type CodeBlockProps = {
  className?: string
  code: string
}

export const CodeBlock = ({ className, code }: CodeBlockProps) => {
  const output = useMemo(() => hljs.highlightAuto(code).value, [code])

  return (
    <pre
      className={classNames(
        "bg-grey-800 text-body-secondary  scrollable scrollable-700 overflow-x-auto rounded-sm p-8 py-4",
        className
      )}
    >
      <code className="[&>.hljs-string]:text-body [&>.hljs-number]:text-body">
        {htmlParser(output)}
      </code>
    </pre>
  )
}
