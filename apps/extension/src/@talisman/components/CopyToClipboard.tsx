import React from "react"

const CopyToClipboard = ({ value, onCopy, className, children }: any) =>
  React.cloneElement(children, {
    onClick: (e) => {
      e.stopPropagation()
      try {
        navigator.clipboard.writeText(value)
        onCopy(value)
      } catch {
        // ignore
      }
    },
  })

export default CopyToClipboard
