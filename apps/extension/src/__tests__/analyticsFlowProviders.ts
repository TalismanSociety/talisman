import type { PendingArea } from "@common/analytics/coverage"
import type { FlowName } from "@common/analytics/flow/registry"

export type ProviderClass =
  | { flow: FlowName; runBy?: string }
  | { viaProp: FlowName }
  | { pending: PendingArea; becomes: string }
  | { none: string }

export const FLOW_PROVIDERS: Readonly<Record<string, ProviderClass>> = {
  AppOnboardProvider: { pending: "5a", becomes: "onboarding" },
  SendFundsWizardProvider: { pending: "5b", becomes: "send" },
  AccountAddQrProvider: { pending: "5a", becomes: "add_account" },
  CopyAddressWizardProvider: { pending: "5b", becomes: "receive" },
  MnemonicBackupModalProviderWrapper: { flow: "recovery_phrase_backup" },
  MnemonicCreateModalProvider: {
    pending: "5a",
    becomes: "add_account: the flow arrives as a prop",
  },
  YieldxyzEnterWizardProvider: { pending: "5d", becomes: "earn_deposit" },
  YieldxyzExitWizardProvider: { pending: "5d", becomes: "earn_withdraw" },
  SwapProvider: { pending: "5b", becomes: "swap" },
  BittensorBondWizardProvider: { pending: "5d", becomes: "staking" },
  BittensorChangeValidatorWizardProvider: { pending: "5d", becomes: "staking" },
  BittensorConvictionLockWizardProvider: { pending: "5d", becomes: "staking" },
  BittensorChangeLockTypeWizardProvider: { pending: "5d", becomes: "staking" },
  BittensorChangeLockHotkeyWizardProvider: { pending: "5d", becomes: "staking" },
  BittensorSettingsWizardProvider: { pending: "5d", becomes: "staking" },
  BondWizardProvider: { pending: "5d", becomes: "staking" },
  NomPoolWithdrawWizardProvider: { pending: "5d", becomes: "staking" },
  UnbondWizardProvider: { pending: "5d", becomes: "staking" },
  BittensorClaimWizardProvider: { pending: "5d", becomes: "staking" },
  YieldxyzManageWizardProvider: { pending: "5d", becomes: "earn_manage" },
  MigratePasswordProvider: { pending: "5a", becomes: "password_migration" },
  JsonAccountImportProvider: { pending: "5a", becomes: "add_account" },
  AddLedgerAccountProvider: { pending: "5a", becomes: "add_account" },
  AccountAddMnemonicProvider: { pending: "5a", becomes: "add_account" },
  SignetConnectProvider: { pending: "5a", becomes: "add_account" },
  NetworkCreateFormProvider: { none: "a form" },
  NetworkFormProvider: { none: "a form" },
  MnemonicDeleteModalProvider: { none: "the id of the item a modal acts on" },
  MnemonicRenameModalProvider: { none: "the id of the item a modal acts on" },
  MnemonicSetPvVerifierModalProvider: { none: "the id of the item a modal acts on" },
  ScrollContainerProvider: { none: "a scroll container ref" },
  AccountCreateContextProvider: { none: "a tab of the add-account menu, not a step" },
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
  SwapBuyProvider: { pending: "5d", becomes: "tao_trade, run by TaoDashboardSwap.tsx" },
  SwapSellProvider: { pending: "5d", becomes: "tao_trade, run by TaoDashboardSwap.tsx" },
  SwapTxWatcherProvider: { none: "a list of transactions" },
  TxHistoryProvider: { none: "history filters" },
  OpenCloseStatusProvider: { none: "an open or closed status" },
}

export const STEP_STATE_ELSEWHERE: Readonly<Record<string, ProviderClass>> = {
  "ui/domains/AccountProxies/AddProxy/AddProxyModal.tsx": {
    pending: "5a",
    becomes: "account_proxy_add",
  },
  "ui/apps/popup/pages/SendFunds/SendFundsRedirect.tsx": {
    none: "redirects into the send route: the send flow runs in SendFundsWizardProvider",
  },
  "ui/domains/Portfolio/AssetDetails/animations/monad/MonadAnimation.tsx": {
    none: "an animation frame counter",
  },
}
