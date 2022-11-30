import { useCallback, useEffect } from "react"
import { Layout } from "../layout"
import { ImportMethodType, useOnboard } from "../context"
import { useNavigate } from "react-router-dom"
import { OnboardCta } from "../components/OnboardCta"
import { FileTextIcon, KeyIcon, MessageCircleIcon, UsbIcon } from "@talisman/theme/icons"

export const ImportMethodPage = () => {
  const navigate = useNavigate()
  const { data, updateData } = useOnboard()

  useEffect(() => {
    if (!data.importAccountType) navigate("/import", { replace: true })
  }, [data, navigate])

  const handleClick = useCallback(
    (importMethodType: ImportMethodType) => () => {
      updateData({ importMethodType })
      navigate(importMethodType === "mnemonic" ? "/import-seed" : "/password")
    },
    [navigate, updateData]
  )

  if (!data.importAccountType) return null

  return (
    <Layout>
      <div className="mx-0 w-full max-w-[87rem] self-center text-center">
        <div className="my-[6rem] text-xl">
          How would you like to import your{" "}
          {data.importAccountType === "ethereum" ? "Ethereum" : "Polkadot"} wallet?
        </div>
        <div className="inline-grid grid-cols-2 gap-12">
          <OnboardCta
            onClick={handleClick("mnemonic")}
            icon={MessageCircleIcon}
            title="Recovery phrase"
            subtitle="Import your seed phrase from any wallet"
          />
          <OnboardCta
            onClick={handleClick("ledger")}
            icon={UsbIcon}
            title="Ledger"
            subtitle="Connect your Ledger wallet"
          />
          {data.importAccountType === "sr25519" && (
            <OnboardCta
              onClick={handleClick("json")}
              icon={FileTextIcon}
              title="JSON file"
              subtitle="Import your private"
            />
          )}
          {data.importAccountType === "ethereum" && (
            <OnboardCta
              onClick={handleClick("private-key")}
              icon={KeyIcon}
              title="Private key"
              subtitle="Import your wallet via raw seed"
            />
          )}
        </div>
      </div>
    </Layout>
  )
}
