/// <reference types="node" />
/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: "development" | "production" | "test"
    readonly PUBLIC_URL: string
    readonly POSTHOG_AUTH_TOKEN?: string
    readonly API_KEY_ONFINALITY?: string
    readonly SENTRY_DSN?: string
    readonly SENTRY_AUTH_TOKEN?: string
    readonly BUILD?: "production" | "canary" | "ci"

    // dev utilities
    readonly PASSWORD?: string
    readonly TEST_MNEMONIC?: string
    readonly EVM_LOGPROXY?: string
  }
}

declare module "*.avif" {
  const src: string
  export default src
}

declare module "*.bmp" {
  const src: string
  export default src
}

declare module "*.gif" {
  const src: string
  export default src
}

declare module "*.jpg" {
  const src: string
  export default src
}

declare module "*.jpeg" {
  const src: string
  export default src
}

declare module "*.png" {
  const src: string
  export default src
}

declare module "*.webp" {
  const src: string
  export default src
}

declare module "*.svg" {
  import * as React from "react"

  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >
}

declare module "*.svg?url" {
  const src: string
  export default src
}

declare module "*.module.css" {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module "*.module.scss" {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module "*.module.sass" {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module "react-router-transition"

declare module "@ui/*" {
  const content: any
  export default content
}

declare module "*.svg" {
  import React = require("react")
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}

declare module "*.woff"
declare module "*.woff2"

declare module "eth-phishing-detect" {
  const isEthPhishingDomain: (url: string) => boolean
  export default isEthPhishingDomain
}
declare module "eth-phishing-detect/src/detector" {
  class PhishingDetector {
    constructor(args: {
      blacklist: string[]
      fuzzylist: string[]
      tolerance: number
      version: number
      whitelist: string[]
    })
    check: (url: string) => {
      type: string
      result: boolean
    }
  }
  export default PhishingDetector
}
