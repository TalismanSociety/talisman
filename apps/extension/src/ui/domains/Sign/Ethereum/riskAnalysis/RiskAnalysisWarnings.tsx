import { WarningInnerKindEnum } from "@blowfishxyz/api-client/v20230605"
import { ShieldNotOkIcon, ShieldUnknownIcon, ShieldZapIcon } from "@talismn/icons"
import { classNames } from "@talismn/util"
import { FC, useMemo } from "react"
import { useTranslation } from "react-i18next"

type UIWarning = {
  message: string
  kind?: WarningInnerKindEnum
  severity: "WARNING" | "CRITICAL" | "INFO"
}

const useSimulationWarning = (warning: UIWarning) => {
  const { t } = useTranslation()

  const { Icon, bgClassName, textClassName } = useMemo(() => {
    switch (warning.severity) {
      case "CRITICAL":
        return {
          Icon: ShieldNotOkIcon,
          bgClassName: "bg-brand-orange/10",
          textClassName: "text-brand-orange",
        }
      case "WARNING":
        return {
          Icon: ShieldZapIcon,
          bgClassName: "bg-alert-warn/10",
          textClassName: "text-alert-warn",
        }
      case "INFO":
        return {
          Icon: ShieldUnknownIcon, // TODO doesn't feel right
          bgClassName: "bg-primary/10",
          textClassName: "text-primary",
        }
    }
  }, [warning.severity])

  const title = useMemo(() => {
    if (!warning.kind) return undefined

    switch (warning.kind) {
      case WarningInnerKindEnum.ApprovalToEoa:
        return t("Approval to EOA")
      case WarningInnerKindEnum.BlurBulkOrderNotOnBlur:
        return t("Blur bulk order on a non-Blur domain")
      case WarningInnerKindEnum.BlurV2OrderNotOnBlur:
        return t("Blur v2 order on a non-Blur domain")
      case WarningInnerKindEnum.BlocklistedDomainCrossOrigin:
        return t("Blocklisted domain cross-origin")
      case WarningInnerKindEnum.BulkApprovalsRequest:
        return t("Bulk approval request")
      case WarningInnerKindEnum.CompromisedAuthorityUpgrade:
        return t("Compromised authority upgrade")
      case WarningInnerKindEnum.CopyCatDomain:
        return t("Copycat domain")
      case WarningInnerKindEnum.CopyCatImageUnresponsiveDomain:
        return t("Copycat unresponsive domain")
      case WarningInnerKindEnum.DanglingApproval:
        return t("Dangling approval")
      case WarningInnerKindEnum.DebuggerPaused:
        return t("Debugger paused")
      case WarningInnerKindEnum.DurableNonce:
        return t("Durable nonce")
      case WarningInnerKindEnum.EthSignTxHash:
        return t("Eth sign transaction hash")
      case WarningInnerKindEnum.Forta:
        return t("Potentially malicious on the Forta Network")
      case WarningInnerKindEnum.ImbalancedDollarValue:
        return t("Imbalanced Dollar Value")
      case WarningInnerKindEnum.KnownMalicious:
        return t("Known malicious")
      case WarningInnerKindEnum.MaliciousPackages:
        return t("Malicious packages detected")
      case WarningInnerKindEnum.MultiCopyCatDomain:
        return t("Multi copycat domain")
      case WarningInnerKindEnum.NewDomain:
        return t("New Domain")
      case WarningInnerKindEnum.PermitNoExpiration:
        return t("Permit without expiration")
      case WarningInnerKindEnum.PermitUnlimitedAllowance:
        return t("Permit with unlimited allowance")
      case WarningInnerKindEnum.PoisonedAddress:
        return t("Poisoned address")
      case WarningInnerKindEnum.ReferencedOfacAddress:
        return t("Referenced OFAC Sanctioned Address")
      case WarningInnerKindEnum.SemiTrustedBlocklistDomain:
        return t("Semi-trusted blocklist domain")
      case WarningInnerKindEnum.SetOwnerAuthority:
        return t("Set owner authority")
      case WarningInnerKindEnum.SuspectedMalicious:
        return t("Suspected malicious behaviour")
      case WarningInnerKindEnum.TooManyTransactions:
        return t("Too many transactions")
      case WarningInnerKindEnum.TradeForNothing:
        return t("Trade for nothing")
      case WarningInnerKindEnum.TradeForUnverifiedNft:
        return t("Trade for unverified NFT")
      case WarningInnerKindEnum.TransferringErc20ToOwnContract:
        return t("Transferring ERC20 to own contract")
      case WarningInnerKindEnum.TransferringTooMuchSol:
        return t("Transferring too much SOL")
      case WarningInnerKindEnum.TransfersMajorityOfYourSol:
        return t("Transfers majority of your SOL")
      case WarningInnerKindEnum.TrustedBlocklistDomain:
        return t("Trusted blocklist domain")
      case WarningInnerKindEnum.UnlimitedAllowanceToNfts:
        return t("Unlimited allowance to NFTs")
      case WarningInnerKindEnum.UnusualGasConsumption:
        return t("Unusual gas consumption")
      case WarningInnerKindEnum.UserAccountOwnerChange:
        return t("User account owner change")
      case WarningInnerKindEnum.WhitelistedDomainCrossOrigin:
        return t("Whitelisted domain cross-origin")
      case WarningInnerKindEnum.YakoaNftIpInfringement:
        return t("Possible IP infringement")
      case WarningInnerKindEnum.TransferToMintAccount:
        return t("Transfer to mint account")
      case WarningInnerKindEnum.ReliableSimulationNotPossible:
        return t("Reliable simulation not possible")
    }
  }, [t, warning.kind])

  return { title, Icon, bgClassName, textClassName }
}

const RiskAnalysisWarning: React.FC<{ warning: UIWarning }> = ({ warning }) => {
  const { title, Icon, bgClassName, textClassName } = useSimulationWarning(warning)

  return (
    <div
      className={classNames(
        "leading-paragraph flex w-full gap-8 rounded p-4",
        bgClassName,
        textClassName
      )}
    >
      <div className="flex flex-col justify-center">
        <div className={classNames("rounded-full p-4", bgClassName)}>
          <Icon className="h-12 w-12" />
        </div>
      </div>
      <div className="flex w-full grow flex-col gap-1">
        <div className="font-bold">{title}</div>
        <div className="text-body-secondary">{warning.message}</div>
      </div>
    </div>
  )
}

export const RiskAnalysisWarnings: FC<{ warnings: UIWarning[] }> = ({ warnings = [] }) => (
  <div className="flex flex-col gap-4">
    {warnings.map((warning) => (
      <RiskAnalysisWarning key={warning.message} warning={warning} />
    ))}
  </div>
)
