import { DEBUG } from "@core/constants"
import { log } from "@core/log"
import HeaderBlock from "@talisman/components/HeaderBlock"
import { notify, notifyUpdate } from "@talisman/components/Notifications"
import Spacer from "@talisman/components/Spacer"
import { ArrowRightIcon } from "@talisman/theme/icons"
import { api } from "@ui/api"
import { useSelectAccountAndNavigate } from "@ui/hooks/useSelectAccountAndNavigate"
import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "talisman-ui"

import Layout from "../../layout"
import { JsonImportAccountsList } from "./JsonAccountsList"
import { JsonFileDrop } from "./JsonFileDrop"
import { UnlockJsonAccountsButton } from "./UnlockJsonAccountsButton"
import { UnlockJsonFileForm } from "./UnlockJsonFileForm"
import { useJsonAccountImport } from "./useJsonAccountImport"

const getFileContent = (file?: File) =>
  new Promise<string>((resolve) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve("")
      reader.readAsText(file)
    } else resolve("")
  })

const AccountJson = () => {
  const { t } = useTranslation("account-add")
  const { setAddress } = useSelectAccountAndNavigate("/portfolio")
  const {
    accounts,
    requiresFilePassword,
    requiresAccountUnlock,
    canImport,
    isMultiAccounts,
    importAccounts,
    selectAccount,
    selectAll,
    selectNone,
    unlockAccounts,
    setFileContent,
    unlockFile,
  } = useJsonAccountImport()

  const [isImporting, setIsImporting] = useState(false)

  const handleImportClick = useCallback(async () => {
    setIsImporting(true)

    const count = accounts?.filter((a) => a.selected).length

    const notificationId = notify(
      {
        type: "processing",
        title: t("Importing {{count}} accounts", { count }),
        subtitle: t("Please wait"),
      },
      { autoClose: false }
    )
    try {
      // TODO trigger import here
      setAddress(await importAccounts())
      notifyUpdate(notificationId, {
        type: "success",
        title: t("Accounts imported", { count }),
        subtitle: "",
      })
    } catch (err) {
      notifyUpdate(notificationId, {
        type: "error",
        title: t("Error importing account"),
        subtitle: (err as Error)?.message,
      })
    }
    setIsImporting(false)
  }, [accounts, importAccounts, setAddress, t])

  const handleFileChange = useCallback(
    async (file?: File) => {
      try {
        if (file) setFileContent(await getFileContent(file))
        else setFileContent(undefined)
      } catch (err) {
        // TODO error management
        setFileContent(undefined)
      }
    },
    [setFileContent]
  )

  return (
    <Layout withBack centered>
      <HeaderBlock
        title={t("Import JSON")}
        text={t("Please choose the .json file you exported from Polkadot.js or Talisman")}
      />
      <Spacer />
      <div data-button-pull-left>
        <JsonFileDrop onChange={handleFileChange} />
        <Spacer />
        {requiresFilePassword && <UnlockJsonFileForm unlockFile={unlockFile} />}
        {accounts && (
          <>
            <JsonImportAccountsList
              accounts={accounts}
              onSelectAccount={selectAccount}
              onSelectAll={selectAll}
              onSelectNone={selectNone}
            />{" "}
            <div className="mt-16 flex w-full justify-end gap-8">
              {isMultiAccounts && (
                <UnlockJsonAccountsButton
                  requiresAccountUnlock={requiresAccountUnlock}
                  unlockAccounts={unlockAccounts}
                  accounts={accounts}
                />
              )}
              <Button
                icon={ArrowRightIcon}
                type="button"
                primary
                disabled={!canImport}
                onClick={handleImportClick}
                processing={isImporting}
              >
                {t("Import")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default AccountJson

// TODO REMOVE BEFORE MERGE
if (DEBUG) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).removeAccounts = async () => {
    for (const address of [
      "5CGSuDxqmymJ3xt2fRWkJY36CU1gNb379zzUyn45NEKCwyAb",
      "5CiV2MAF7YzSsjVNwKwo2vuz2JfLdSgftEsbVds8wBEz119F",
      "0x5C9EBa3b10E45BF6db77267B40B95F3f91Fc5f67",
      "5EHNsSHuWrNMYgx3bPhsRVLG77DX8sS8wZrnbtieJzbtSZr9",
      "5DyUfURQT1NX1Vyid1apvWP5yTnPTtouMyftrWmgsNAa14kM",
      "5CaSZQyy9RQqdt3qMQEDMm1dYSVee9Sr7LdeGQU221B1WNLM",
    ]) {
      try {
        log.log(`Removing account ${address}`)
        const result = await api.accountForget(address)
        log.log("result", result)
      } catch (err) {
        log.error(`Failed to forget ${address}`, { err })
      }
    }
  }
}
