import { TokenId } from "@core/domains/tokens/types"
import { ValidRequests } from "@core/libs/requests/types"
import { Address } from "@core/types/base"
import { Properties } from "posthog-js"

export interface RequestOnboard {
  pass: string
  passConfirm: string
  mnemonic?: string
}

export interface RequestLogin {
  pass: string
}

export interface RequestRoute {
  route: string
}

export type ModalOpenRequestBuy = {
  modalType: "buy"
}
export type ModalOpenRequestSend = {
  modalType: "send"
  from?: Address
  transferableTokenId?: string
}
export type ModalOpenRequest = ModalOpenRequestBuy | ModalOpenRequestSend
export type SendFundsOpenRequest = { from?: Address; tokenId?: TokenId; to?: Address }

export interface AnalyticsCaptureRequest {
  eventName: string
  options?: Properties
}

// values must match the flags defined in Posthog
export type FeatureVariants = Partial<{
  WALLET_FUNDING: boolean
  BUY_CRYPTO: boolean
  LINK_TX_HISTORY: boolean
  LINK_STAKING: boolean
  PARITY_SIGNER: boolean
  SEND_FUNDS_V2: boolean
  BANNER_NOM_POOL_STAKING: boolean
  USE_ONFINALITY_API_KEY_SUBSTRATE: boolean
  USE_ONFINALITY_API_KEY_EVM: boolean
}>
export type FeatureFlag = keyof FeatureVariants

type FALSE = "FALSE"
type TRUE = "TRUE"
type UNKNOWN = "UNKNOWN"

type StringTernary = FALSE | TRUE | UNKNOWN

export type OnboardedType = StringTernary
export type LoggedinType = StringTernary

export type ChangePasswordRequest = {
  currentPw: string
  newPw: string
  newPwConfirm: string
}

export interface CheckPasswordRequest {
  password: string
}

export interface RequestAllowPhishingSite {
  url: string
}

export interface AppMessages {
  "pri(app.onboard)": [RequestOnboard, OnboardedType]
  "pri(app.onboardStatus)": [null, OnboardedType]
  "pri(app.onboardStatus.subscribe)": [null, boolean, OnboardedType]
  "pri(app.authenticate)": [RequestLogin, boolean]
  "pri(app.authStatus)": [null, LoggedinType]
  "pri(app.authStatus.subscribe)": [null, boolean, LoggedinType]
  "pri(app.lock)": [null, boolean]
  "pri(app.changePassword)": [ChangePasswordRequest, boolean]
  "pri(app.checkPassword)": [CheckPasswordRequest, boolean]
  "pri(app.dashboardOpen)": [RequestRoute, boolean]
  "pri(app.onboardOpen)": [null, boolean]
  "pri(app.popupOpen)": [null, boolean]
  "pri(app.modalOpen.request)": [ModalOpenRequest, boolean]
  "pri(app.sendFunds.open)": [SendFundsOpenRequest, boolean]
  "pri(app.modalOpen.subscribe)": [null, boolean, ModalOpenRequest]
  "pri(app.promptLogin)": [boolean, boolean]
  "pri(app.analyticsCapture)": [AnalyticsCaptureRequest, boolean]
  "pri(app.phishing.addException)": [RequestAllowPhishingSite, boolean]
  "pri(app.resetWallet)": [null, boolean]
  "pri(app.requests)": [null, boolean, ValidRequests[]]
}
