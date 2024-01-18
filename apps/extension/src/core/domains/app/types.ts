import { TokenId } from "@core/domains/tokens/types"
import { ValidRequests } from "@core/libs/requests/types"
import { Address } from "@core/types/base"
import { Properties } from "posthog-js"

export interface RequestOnboardCreatePassword {
  pass: string
  passConfirm: string
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
export type ModalOpenRequest = ModalOpenRequestBuy
export type SendFundsOpenRequest = {
  from?: Address
  tokenId?: TokenId
  tokenSymbol?: string
  to?: Address
}

export interface AnalyticsCaptureRequest {
  eventName: string
  options?: Properties
}

// values must match the flags defined in Posthog
export type FeatureVariants = Partial<{
  BUY_CRYPTO: boolean
  LINK_STAKING: boolean
  USE_ONFINALITY_API_KEY: boolean
  TEST_VARIANT: "VARIANT1" | "VARIANT2" // keep this one for string type checking
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
  "pri(app.onboardCreatePassword)": [RequestOnboardCreatePassword, boolean]
  "pri(app.authenticate)": [RequestLogin, boolean]
  "pri(app.authStatus)": [null, LoggedinType]
  "pri(app.authStatus.subscribe)": [null, boolean, LoggedinType]
  "pri(app.lock)": [null, boolean]
  "pri(app.changePassword)": [ChangePasswordRequest, boolean]
  "pri(app.checkPassword)": [CheckPasswordRequest, boolean]
  "pri(app.dashboardOpen)": [RequestRoute, boolean]
  "pri(app.onboardOpen)": [null, boolean]
  "pri(app.popupOpen)": [string | undefined, boolean]
  "pri(app.modalOpen.request)": [ModalOpenRequest, boolean]
  "pri(app.sendFunds.open)": [SendFundsOpenRequest, boolean]
  "pri(app.modalOpen.subscribe)": [null, boolean, ModalOpenRequest]
  "pri(app.promptLogin)": [boolean, boolean]
  "pri(app.analyticsCapture)": [AnalyticsCaptureRequest, boolean]
  "pri(app.phishing.addException)": [RequestAllowPhishingSite, boolean]
  "pri(app.resetWallet)": [null, boolean]
  "pri(app.requests)": [null, boolean, ValidRequests[]]
}
