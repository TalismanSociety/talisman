import type { JSXElement } from "@swc/types"
import type { Plugin } from "i18next-cli"

// i18next-cli 1.73.1 skips <Trans defaults="..." /> without an i18nKey.
// At runtime, react-i18next uses defaults as the key. Supply that key only to
// the extractor; leave application source and explicit i18nKey props unchanged.
export const transDefaultsPlugin = (): Plugin => ({
  name: "trans-defaults-as-key",
  onVisitNode(node) {
    if (node.type !== "JSXElement") return
    const { opening } = node as JSXElement
    if (opening.name.type !== "Identifier" || opening.name.value !== "Trans") return
    const attributes = opening.attributes.filter((attribute) => attribute.type === "JSXAttribute")
    if (
      attributes.some(
        (attribute) => attribute.name.type === "Identifier" && attribute.name.value === "i18nKey"
      )
    )
      return
    const defaults = attributes.find(
      (attribute) => attribute.name.type === "Identifier" && attribute.name.value === "defaults"
    )
    if (defaults?.name.type !== "Identifier") return
    opening.attributes.push({
      ...defaults,
      name: { ...defaults.name, type: "Identifier", value: "i18nKey" },
    })
  },
})
