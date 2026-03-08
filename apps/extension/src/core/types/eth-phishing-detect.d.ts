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
