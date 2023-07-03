import { Button } from "talisman-ui"

import { Section } from "../../shared/Section"

const handleAddInvalidMetadata = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).postMessage({
    id: "1657056165593.8",
    message: "pub(metadata.provide)",
    origin: "talisman-page",
    request: { origin: "Talisman" },
  })
}

export const InvalidMetadata = () => {
  return (
    <Section title="Metadata">
      <Button onClick={handleAddInvalidMetadata}>Invalid Metadata</Button>
    </Section>
  )
}
