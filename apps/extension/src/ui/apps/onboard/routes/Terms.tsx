import { MouseEventHandler, useEffect, useState } from "react"
import styled from "styled-components"
import Button from "@talisman/components/Button"
import { Layout } from "../layout"
import { settingsStore } from "@core/domains/app/store.settings"
import { Checkbox } from "@talisman/components/Checkbox"
import { ReactComponent as Talismans } from "@talisman/theme/images/onboard_terms.svg"
import { useOnboard } from "../context"

const Picture = styled(Talismans)`
  width: 44rem;
  height: 39.252rem;
`

const H1 = styled.h1`
  &&& {
    margin-bottom: 0.8rem;
  }
`

const Checkboxes = styled.div`
  font-size: 1.4rem;
  color: var(--color-mid);
  margin-bottom: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  @media (max-width: 1146px) {
    align-items: center;
  }
`

const A = styled.a`
  color: var(--color-foreground);
`

const BtnProceed = styled(Button)`
  width: 19.8rem;
  display: inline-block;
`

const noPropagation: MouseEventHandler = (e) => e.stopPropagation()

export const Terms = () => {
  const { agreeToS, setAgreeToS } = useOnboard()
  const [useErrorTracking, setUseErrorTracking] = useState(false)

  // init
  useEffect(() => {
    settingsStore.get("useErrorTracking").then(setUseErrorTracking)
  }, [])

  // update
  useEffect(() => {
    settingsStore.set({ useErrorTracking })
  }, [useErrorTracking])

  return (
    <Layout picture={<Picture />}>
      <H1>Disclaimer</H1>
      <p>
        The Talisman wallet extension is currently in Beta. This software has been audited but may
        still contain some bugs. Using this software is not without risk.
      </p>
      <Checkboxes>
        <Checkbox tabIndex={2} checked={agreeToS} onChange={(e) => setAgreeToS(e.target.checked)}>
          I agree to the{" "}
          <A
            href="https://docs.talisman.xyz/legal-and-security/terms-of-use"
            target="_blank"
            rel="noreferrer"
            onClick={noPropagation}
          >
            Terms of Use
          </A>
        </Checkbox>
        <Checkbox
          tabIndex={1}
          checked={useErrorTracking}
          onChange={({ target }) => setUseErrorTracking(target.checked)}
        >
          Help Talisman improve by allowing{" "}
          <A href="https://sentry.io" target="_blank" rel="noreferrer" onClick={noPropagation}>
            anonymous error reporting
          </A>
        </Checkbox>
      </Checkboxes>
      <div>
        <BtnProceed
          tabIndex={3}
          className="btn-proceed"
          primary
          to={`/onboard`}
          disabled={!agreeToS}
        >
          Proceed
        </BtnProceed>
      </div>
    </Layout>
  )
}
