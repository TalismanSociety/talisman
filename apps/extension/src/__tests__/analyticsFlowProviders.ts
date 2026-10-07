import type { FlowName } from "@common/analytics/flow/registry"

export type ProviderClass =
  | { flow: FlowName; runBy?: string }
  | { viaProp: FlowName }
  | { none: string }

export const FLOW_PROVIDERS: Readonly<Record<string, ProviderClass>> = {
  AppOnboardProvider: { flow: "onboarding" },
  SendFundsWizardProvider: { flow: "send" },
  AccountAddQrProvider: { flow: "add_account", runBy: "ui/domains/Account/AccountAdd/flow.ts" },
  CopyAddressWizardProvider: { flow: "receive" },
  MnemonicBackupModalProviderWrapper: { flow: "recovery_phrase_backup" },
  MnemonicCreateModalProvider: {
    flow: "add_account",
    runBy: "ui/domains/Account/AccountAdd/flow.ts",
  },
  YieldxyzEnterWizardProvider: { flow: "earn_deposit" },
  YieldxyzExitWizardProvider: { flow: "earn_withdraw" },
  SwapProvider: { flow: "swap" },
  BittensorBondWizardProvider: { flow: "staking" },
  BittensorChangeValidatorWizardProvider: { flow: "staking" },
  BittensorConvictionLockWizardProvider: { flow: "staking" },
  BittensorChangeLockTypeWizardProvider: { flow: "staking" },
  BittensorChangeLockHotkeyWizardProvider: { flow: "staking" },
  BittensorSettingsWizardProvider: { flow: "bittensor_settings" },
  BondWizardProvider: { flow: "staking" },
  NomPoolWithdrawWizardProvider: { flow: "staking" },
  UnbondWizardProvider: { flow: "staking" },
  BittensorClaimWizardProvider: { flow: "staking" },
  YieldxyzManageWizardProvider: { flow: "earn_manage" },
  MigratePasswordProvider: { flow: "password_migration" },
  JsonAccountImportProvider: {
    flow: "add_account",
    runBy: "ui/domains/Account/AccountAdd/flow.ts",
  },
  AddLedgerAccountProvider: { flow: "add_account", runBy: "ui/domains/Account/AccountAdd/flow.ts" },
  AccountAddMnemonicProvider: {
    flow: "add_account",
    runBy: "ui/domains/Account/AccountAdd/flow.ts",
  },
  SignetConnectProvider: { flow: "add_account", runBy: "ui/domains/Account/AccountAdd/flow.ts" },
  NetworkCreateFormProvider: { none: "a form" },
  NetworkFormProvider: { none: "a form" },
  MnemonicDeleteModalProvider: { none: "the id of the item a modal acts on" },
  MnemonicRenameModalProvider: { none: "the id of the item a modal acts on" },
  MnemonicSetPvVerifierModalProvider: { none: "the id of the item a modal acts on" },
  ScrollContainerProvider: { none: "a scroll container ref" },
  AccountCreateContextProvider: { none: "a tab of the add-account menu, not a step" },
  AccountAddFlowProvider: { flow: "add_account" },
  ManageAccountsProvider: { none: "a search box" },
  PasswordUnlockProvider: { none: "a password gate inside other flows" },
  MnemonicUnlockProvider: { none: "a password gate inside other flows" },
  PortfolioNavigationProvider: { none: "the portfolio selection" },
  ExternalAddressWarningProvider: { none: "a warning inside the send flow" },
  SendFundsProvider: { none: "the send form: its steps live in SendFundsWizardProvider" },
  EthSignMessageRequestProvider: { none: "a dapp request: dapp_request_* covers it" },
  EthSignTransactionRequestProvider: { none: "a dapp request: dapp_request_* covers it" },
  PolkadotSigningRequestProvider: { none: "a dapp request: dapp_request_* covers it" },
  SubSignDecodedBatchDrawerProvider: { none: "a drawer index" },
  RiskAnalysisProviderInner: { none: "a risk scan result" },
  TaoDashboardNetworkProvider: { none: "the network id" },
  RealtimeStakeEventsProvider: { none: "an events feed" },
  SwapBuyProvider: {
    flow: "tao_trade",
    runBy: "ui/domains/TaoDashboard/subnet/swap/useSwapSubmit.ts",
  },
  SwapSellProvider: {
    flow: "tao_trade",
    runBy: "ui/domains/TaoDashboard/subnet/swap/useSwapSubmit.ts",
  },
  SwapTxWatcherProvider: { none: "a list of transactions" },
  TxHistoryProvider: { none: "history filters" },
  OpenCloseStatusProvider: { none: "an open or closed status" },
}

export const STEP_STATE_ELSEWHERE: Readonly<Record<string, ProviderClass>> = {
  "ui/domains/AccountProxies/AddProxy/AddProxyModal.tsx": { flow: "account_proxy_add" },
  "ui/apps/popup/pages/SendFunds/SendFundsRedirect.tsx": {
    none: "redirects into the send route: the send flow runs in SendFundsWizardProvider",
  },
  "ui/domains/Portfolio/AssetDetails/animations/monad/MonadAnimation.tsx": {
    none: "an animation frame counter",
  },
}
