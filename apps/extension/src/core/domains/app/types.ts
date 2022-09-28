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

export declare type ModalTypes = "send" | "buy"
export interface ModalOpenParams {
  modalType: ModalTypes
}

export interface AnalyticsCaptureRequest {
  eventName: string
  options?: posthog.Properties
}

// values must match the flags defined in Posthog
export type FeatureFlag = "WALLET_FUNDING" | "BUY_CRYPTO"
export type FeatureVariants = Record<FeatureFlag, string | boolean>

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

export interface AppMessages {
  "pri(app.onboard)": [RequestOnboard, OnboardedType]
  "pri(app.onboardStatus)": [null, OnboardedType]
  "pri(app.onboardStatus.subscribe)": [null, boolean, OnboardedType]
  "pri(app.authenticate)": [RequestLogin, boolean]
  "pri(app.authStatus)": [null, LoggedinType]
  "pri(app.authStatus.subscribe)": [null, boolean, LoggedinType]
  "pri(app.lock)": [null, boolean]
  "pri(app.changePassword)": [ChangePasswordRequest, boolean]
  "pri(app.dashboardOpen)": [RequestRoute, boolean]
  "pri(app.onboardOpen)": [null, boolean]
  "pri(app.popupOpen)": [null, boolean]
  "pri(app.modalOpen.request)": [ModalOpenParams, boolean]
  "pri(app.modalOpen.subscribe)": [null, boolean, ModalOpenParams]
  "pri(app.promptLogin)": [boolean, boolean]
  "pri(app.analyticsCapture)": [AnalyticsCaptureRequest, boolean]
}
