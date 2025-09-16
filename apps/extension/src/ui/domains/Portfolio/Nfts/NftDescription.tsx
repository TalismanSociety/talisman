import DOMPurify from "dompurify"
import htmlParser from "html-react-parser"
import { marked } from "marked"
import { FC, useMemo } from "react"

export const NftDescription: FC<{ text: string | null }> = ({ text }) => {
  const html = useMemo(() => {
    if (!text) return null
    return DOMPurify.sanitize(marked(text, { gfm: true, async: false }) as string)
  }, [text])

  return html ? <div className="[&_a]:underline">{htmlParser(html)}</div> : null
}
