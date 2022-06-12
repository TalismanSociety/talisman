import { CSSProperties } from "react"
import styled, { CSSObject, DefaultTheme } from "styled-components"
import { custom, fontSizes } from "@talisman/theme/definitions"

const BorderRadius = {
  normal: custom["border-radius"],
  tiny: custom["border-radius-tiny"],
  small: custom["border-radius-small"],
  large: custom["border-radius-large"],
}

// use only lowercase (no camel case) or react will transform and output props as attributes
// also do not use known properties (ex color) or they will be output as attribute too
type BoxProps = {
  gap?: number
  justify?: CSSProperties["justifyContent"]
  align?: CSSProperties["alignItems"]
  textalign?: CSSProperties["textAlign"]
  flex?: boolean
  column?: boolean
  inline?: boolean
  height?: CSSProperties["height"]
  width?: CSSProperties["width"]
  fullwidth?: boolean
  fullheight?: boolean
  grow?: boolean
  padding?: CSSProperties["padding"]
  margin?: CSSProperties["margin"]
  border?: CSSProperties["border"]
  clip?: boolean
  borderradius?: boolean | keyof typeof BorderRadius
  bold?: boolean
  fontsize?: keyof typeof fontSizes
  fontsizecustom?: number | string
  fg?: keyof DefaultTheme
  bg?: keyof DefaultTheme
}

const getDisplay = (props: BoxProps): CSSProperties["display"] => {
  if (props.flex) return props.inline ? "flex" : "inline-flex"
  return props.inline ? "inline" : "block"
}

const getSize = (size?: string | number): string | undefined => {
  if (typeof size === "string") return size
  if (typeof size === "number") return `${size}rem`
  return undefined
}

const getBorderRadius = (props: BoxProps): string => {
  if (props.borderradius === undefined) return ""
  if (typeof props.borderradius === "string") return props.borderradius
  if (typeof props.borderradius === "boolean")
    return props.borderradius ? BorderRadius.normal : "none"
  return BorderRadius[props.borderradius]
}

const getFontSize = (props: BoxProps) => {
  if (typeof props.fontsizecustom === "number") return `${props.fontsizecustom}rem`
  if (typeof props.fontsizecustom === "string") return props.fontsizecustom
  if (props.fontsize !== undefined) return `var(--font-size-${props.fontsize})`
  return undefined
}

// generic method in case we want to reuse it on span or other tags
const boxPropsInjector = (props: BoxProps): CSSObject => {
  return {
    display: getDisplay(props),
    flexDirection: props.flex ? (props.column ? "column" : "row") : undefined,
    width: props.fullwidth ? "100%" : getSize(props.width),
    height: props.fullheight ? "100%" : getSize(props.height),
    flexGrow: !!props.grow ? "1" : undefined,
    overflow: props.clip ? "hidden" : undefined,
    borderRadius: getBorderRadius(props),
    textAlign: props.textalign,
    justifyContent: props.justify,
    alignItems: props.align,
    fontSize: getFontSize(props),
    gap: props.gap !== undefined ? `${props.gap}rem` : undefined,
    color: props.fg ? `var(--color-${props.fg})` : undefined,
    backgroundColor: props.bg ? `var(--color-${props.bg})` : undefined,
    padding: props.padding,
    margin: props.margin,
    border: props.border,
  }
}

export const Box = styled.div<BoxProps>(boxPropsInjector)
