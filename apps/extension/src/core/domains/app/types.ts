import { Address } from "@core/types/base"
import posthog from "posthog-js"

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

export interface AnalyticsCaptureRequest {
  eventName: string
  options?: posthog.Properties
}

// values must match the flags defined in Posthog
export type FeatureVariants = {
  WALLET_FUNDING?: boolean
  BUY_CRYPTO?: boolean
  POPUP_BOTTOM_NAV_VARIANT?: "WITH_TOOLTIP" | "WITHOUT_TOOLTIP"
  LEDGER_EVM: boolean
}
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
  "pri(app.modalOpen.subscribe)": [null, boolean, ModalOpenRequest]
  "pri(app.promptLogin)": [boolean, boolean]
  "pri(app.analyticsCapture)": [AnalyticsCaptureRequest, boolean]
}
