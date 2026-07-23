import type { TokenId } from "@talismn/chaindata-provider"

import type { ValidRequests } from "../../libs/requests/types"
import type { Address } from "../../types/base"
import type { PostHogCaptureProperties } from "../analytics/types"
import type { RemoteConfigData } from "./remote-config/fetchRemoteConfig"

export type RemoteConfigStoreData = RemoteConfigData

export interface BiometricStoreData {
  /** Base64url-encoded WebAuthn credential ID */
  credentialId?: string
  /** Hashed password encrypted with PRF-derived AES-256-GCM key (Base64) */
  encryptedPassword?: string
  /** AES-GCM initialization vector (Base64) */
  iv?: string
  /** Salt passed to the WebAuthn PRF extension (Base64) */
  prfSalt?: string
}

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

export type SendFundsOpenRequest = {
  from?: Address
  tokenId?: TokenId
  tokenSymbol?: string
  to?: Address
}

export interface AnalyticsCaptureRequest {
  eventName: string
  options?: PostHogCaptureProperties
}

export type FeatureFlag = keyof RemoteConfigStoreData["featureFlags"]

type FALSE = "FALSE"
type TRUE = "TRUE"
type UNKNOWN = "UNKNOWN"

type StringTernary = FALSE | TRUE | UNKNOWN

export type LoggedinType = StringTernary

export type ChangePasswordRequest = {
  currentPw: string
  newPw: string
  newPwConfirm: string
}
export const ChangePasswordStatusUpdateStatus = {
  VALIDATING: "VALIDATING",
  PREPARING: "PREPARING",
  MNEMONICS: "MNEMONICS",
  KEYPAIRS: "KEYPAIRS",
  AUTH: "AUTH",
  DONE: "DONE",
  ERROR: "ERROR",
} as const

export type ChangePasswordStatusUpdateType =
  (typeof ChangePasswordStatusUpdateStatus)[keyof typeof ChangePasswordStatusUpdateStatus]

export type ChangePasswordStatusUpdate = {
  status: ChangePasswordStatusUpdateType
  message?: string
}

export interface CheckPasswordRequest {
  password: string
}

export interface RequestAllowPhishingSite {
  url: string
}

export interface BiometricEnrollRequest {
  credentialId: string
  prfSalt: string
  /** Base64-encoded PRF output, used by the background to derive the encryption key */
  prfOutput: string
}

export interface BiometricAuthenticateRequest {
  /** Base64-encoded PRF output, used by the background to derive the decryption key */
  prfOutput: string
}

/** The non-sensitive part of the enrollment, needed by the UI to run the WebAuthn ceremony */
export interface BiometricCredentialInfo {
  credentialId: string
  prfSalt: string
}

export interface AppMessages {
  "pri(app.onboardCreatePassword)": [RequestOnboardCreatePassword, boolean]
  "pri(app.authenticate)": [RequestLogin, boolean]
  "pri(app.authStatus)": [null, LoggedinType]
  "pri(app.authStatus.subscribe)": [null, boolean, LoggedinType]
  "pri(app.lock)": [null, boolean]
  "pri(app.changePassword)": [ChangePasswordRequest, boolean]
  "pri(app.changePassword.subscribe)": [ChangePasswordRequest, boolean, ChangePasswordStatusUpdate]
  "pri(app.checkPassword)": [CheckPasswordRequest, boolean]
  "pri(app.dashboardOpen)": [RequestRoute, boolean]
  "pri(app.onboardOpen)": [null, boolean]
  "pri(app.popupOpen)": [string | undefined, boolean]
  "pri(app.sendFunds.open)": [SendFundsOpenRequest, boolean]
  "pri(app.promptLogin)": [null, boolean]
  "pri(app.analyticsCapture)": [AnalyticsCaptureRequest, boolean]
  "pri(app.phishing.addException)": [RequestAllowPhishingSite, boolean]
  "pri(app.resetWallet)": [null, boolean]
  "pri(app.requests)": [null, boolean, ValidRequests[]]

  // biometric unlock
  "pri(app.biometric.enroll)": [BiometricEnrollRequest, boolean]
  "pri(app.biometric.unenroll)": [null, boolean]
  "pri(app.biometric.isEnrolled.subscribe)": [null, boolean, { enrolled: boolean }]
  "pri(app.biometric.getCredentialInfo)": [null, BiometricCredentialInfo | null]
  "pri(app.biometric.authenticate)": [BiometricAuthenticateRequest, boolean]
}
