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
    readonly SIMPLE_LOCALIZE_API_KEY?: string
    readonly SIMPLE_LOCALIZE_PROJECT_TOKEN?: string
    readonly BUILD?: "production" | "canary" | "ci" | "qa" | "dev"

    // dev utilities
    readonly PASSWORD?: string
    readonly TEST_MNEMONIC?: string
    readonly EVM_LOGPROXY?: string
    readonly COINGECKO_API_DOMAIN?: string
    readonly COINGECKO_API_KEY_NAME?: string
    readonly COINGECKO_API_KEY_VALUE?: string
    readonly BLOWFISH_BASE_PATH?: string
    readonly BLOWFISH_API_KEY?: string
    readonly NFTS_API_KEY?: string
    readonly NFTS_API_BASE_PATH?: string
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

declare module "*.svg" {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  import React = require("react")
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  const src: string
  export default src
}

declare module "*.woff"
declare module "*.woff2"

declare module "*.md" {
  const value: string
  export default value
}

// below are the types for the eth-phishing-detect package
// they are necessary for dev mode to function properly
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
