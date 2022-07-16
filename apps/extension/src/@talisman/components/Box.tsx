import { getOverflowAncestors } from "@floating-ui/react-dom"
import { custom, fontSizes } from "@talisman/theme/definitions"
import { CSSProperties } from "react"
import styled, { CSSObject, DefaultTheme } from "styled-components"

const BorderRadius = {
  normal: custom["border-radius"],
  tiny: custom["border-radius-tiny"],
  small: custom["border-radius-small"],
  large: custom["border-radius-large"],
}

// use only lowercase (no camel case) or react will transform and output props as attributes
// also do not use known properties (ex color) or they will be output as attribute too
type BoxProps = {
  // size
  height?: CSSProperties["height"]
  width?: CSSProperties["width"]
  fullwidth?: boolean
  fullheight?: boolean

  // overflow
  overflow?: CSSProperties["overflow"]
  textOverflow?: CSSProperties["textOverflow"]
  noWrap?: boolean

  // position
  relative?: boolean
  absolute?: boolean
  fixed?: boolean

  // layout
  gap?: number
  grow?: boolean
  justify?: CSSProperties["justifyContent"]
  align?: CSSProperties["alignItems"]
  textalign?: CSSProperties["textAlign"]
  flex?: boolean
  column?: boolean
  inline?: boolean
  padding?: CSSProperties["padding"]
  margin?: CSSProperties["margin"]
  border?: CSSProperties["border"]
  borderradius?: boolean | keyof typeof BorderRadius

  // transitions
  transition?: boolean
  speed?: "fast" | "slow" | "slower" | "xslower"
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out"

  // colors
  fg?: keyof DefaultTheme
  bg?: keyof DefaultTheme
  opacity?: number

  // fonts
  bold?: boolean
  fontsize?: keyof typeof fontSizes
  fontsizecustom?: CSSProperties["fontSize"]
  lineheight?: keyof typeof fontSizes
  lineheightcustom?: CSSProperties["fontSize"]

  // cursor
  pointer?: boolean
}

const getDisplay = (props: BoxProps): CSSProperties["display"] => {
  if (props.flex) return props.inline ? "inline-flex" : "flex"
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

const getLineHeight = (props: BoxProps) => {
  if (typeof props.lineheightcustom === "number") return `${props.lineheightcustom}rem`
  if (typeof props.lineheightcustom === "string") return props.lineheightcustom
  if (props.lineheight !== undefined) return `var(--font-size-${props.lineheight})`
  return undefined
}

const getFontWeight = (props: BoxProps) => {
  if (props.bold !== undefined)
    return props.bold ? "var(--font-weight-bold)" : "var(--font-weight-normal)"
  return undefined
}

const getDimensionProp = (props: BoxProps, prop: "margin" | "padding") => {
  if (typeof props[prop] === "number") return `${props[prop]}rem`
  return props[prop]
}

const getTransition = (props: BoxProps) => {
  if (!props.transition) return undefined
  const speed =
    props.speed !== undefined ? `var(--transition-speed-${props.speed})` : "var(--transition-speed)"
  return `all ${speed} ${props.easing ?? "ease-in-out"}`
}

const getPosition = (props: BoxProps) => {
  if (props.relative) return "relative"
  if (props.absolute) return "absolute"
  if (props.fixed) return "fixed"
  return undefined
}

const getCursor = (props: BoxProps) => {
  if (props.pointer) return "pointer"
  return undefined
}

// generic method in case we want to reuse it on span or other tags
const boxPropsInjector = (props: BoxProps): CSSObject => {
  return {
    display: getDisplay(props),
    position: getPosition(props),
    flexDirection: props.flex ? (props.column ? "column" : "row") : undefined,
    width: props.fullwidth ? "100%" : getSize(props.width),
    height: props.fullheight ? "100%" : getSize(props.height),
    flexGrow: props.grow ? "1" : undefined,
    borderRadius: getBorderRadius(props),
    textAlign: props.textalign,
    justifyContent: props.justify,
    alignItems: props.align,
    fontSize: getFontSize(props),
    lineHeight: getLineHeight(props),
    gap: props.gap !== undefined ? `${props.gap}rem` : undefined,
    color: props.fg ? `var(--color-${props.fg})` : undefined,
    backgroundColor: props.bg ? `var(--color-${props.bg})` : undefined,
    padding: getDimensionProp(props, "padding"),
    margin: getDimensionProp(props, "margin"),
    border: props.border,
    fontWeight: getFontWeight(props),
    transition: getTransition(props),
    opacity: props.opacity !== undefined ? props.opacity : undefined,
    overflow: props.overflow,
    textOverflow: props.textOverflow,
    whiteSpace: props.noWrap ? "nowrap" : undefined,
    cursor: getCursor(props),
  }
}

export const Box = styled.div<BoxProps>(boxPropsInjector)
