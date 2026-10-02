import { act, cleanup, fireEvent, render } from "@testing-library/react"
import { Modal } from "@ui/components/Modal"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { reportErrorShown } from "./errorShown"
import { flows, useFlow } from "./flows"

const track = vi.hoisted(() => vi.fn())
const trackFlowEvent = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track, trackFlowEvent }))

vi.mock("@common/analytics/flow/registry", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@common/analytics/flow/registry")>()
  const { defineFlow, flowRegistry } = await import("@common/analytics/flow/defineFlow")
  const transfer = defineFlow("transfer", {
    subject: "sending a transfer",
    steps: ["form", "review"],
    settlement: "transaction",
  })
  const FLOWS = flowRegistry(...actual.flowList(), transfer)
  const transferRef = (event: string) => {
    const lifecycle = Object.entries(transfer.eventNames).find(([, name]) => name === event)?.[0]
    return lifecycle ? { flow: transfer, lifecycle: lifecycle as "started" } : null
  }
  return {
    ...actual,
    FLOWS,
    flowList: () => Object.values(FLOWS),
    flowEventRef: (event: string) => actual.flowEventRef(event) ?? transferRef(event),
  }
})

const PILOT = "recovery_phrase_backup"
type Step = "acknowledgement" | "show" | "verify"

const sent = () =>
  trackFlowEvent.mock.calls.map(([event, properties, transactionId]) => ({
    event: (event as string).replace(`${PILOT}_`, ""),
    ...properties,
    ...(transactionId && { transactionId }),
  }))
const lifecycles = () => sent().map(({ event }) => event)
const closes = () =>
  track.mock.calls.filter(([event]) => event === "modal_closed").map(([, props]) => props.dismiss)

let controls: {
  setOpen: (open: boolean) => void
  setStep: (step: Step) => void
}

/** The pilot's shape: a provider mounted for the page, wrapping its Modal, active while open. */
const Backup = ({ initiallyOpen = true }: { initiallyOpen?: boolean }) => {
  const [isOpen, setOpen] = useState(initiallyOpen)
  const [step, setStep] = useState<Step>("acknowledgement")
  controls = { setOpen, setStep }
  useFlow(flows.recovery_phrase_backup, { active: isOpen, step, entry: "settings" })
  return (
    <Modal analyticsId="backup" isOpen={isOpen} onDismiss={() => setOpen(false)}>
      <button
        type="button"
        onClick={() => {
          flows.recovery_phrase_backup.completed({ verified: true })
          setOpen(false)
        }}
      >
        finish
      </button>
    </Modal>
  )
}

const Bound = ({ step }: { step: Step }) => {
  useFlow(flows.recovery_phrase_backup, { step, entry: "reminder" })
  return null
}

const typeChecks = () => {
  flows.recovery_phrase_backup.step("show")
  // @ts-expect-error not a step of the flow
  flows.recovery_phrase_backup.step("nope")
  flows.recovery_phrase_backup.completed({ verified: true })
  // @ts-expect-error verified is required on the pilot's completed
  flows.recovery_phrase_backup.completed()
  flows.recovery_phrase_backup.submitted()
  // @ts-expect-error the pilot's submitted takes no properties
  flows.recovery_phrase_backup.submitted({ verified: true })
  // @ts-expect-error no such flow
  flows.nope
  const Wrong = () => {
    // @ts-expect-error not a step of the flow
    useFlow(flows.recovery_phrase_backup, { step: "wrong", entry: "settings" })
    // @ts-expect-error an entry outside the flow's list
    useFlow(flows.recovery_phrase_backup, { entry: "dashboard" })
    // @ts-expect-error a flow with entries needs one
    useFlow(flows.recovery_phrase_backup, { step: "show" })
    return null
  }
  return Wrong
}

describe("useFlow", () => {
  it("rejects bad reports at compile time: `pnpm typecheck` checks the @ts-expect-error lines", () => {
    expect(typeChecks).toBeTypeOf("function")
  })

  beforeEach(() => {
    track.mockClear()
    trackFlowEvent.mockClear()
  })
  afterEach(cleanup)

  it("starts once per mount with a fresh flow_id, then one step_viewed per change of step", () => {
    const first = render(<Bound step="acknowledgement" />)
    first.rerender(<Bound step="acknowledgement" />)
    first.rerender(<Bound step="show" />)
    first.unmount()
    render(<Bound step="show" />)

    expect(lifecycles()).toEqual([
      "started",
      "step_viewed",
      "step_viewed",
      "abandoned",
      "started",
      "step_viewed",
    ])
    const ids = sent().map(({ flow_id }) => flow_id)
    expect(new Set(ids.slice(0, 4)).size).toBe(1)
    expect(ids[4]).not.toBe(ids[0])
    expect(sent()[0]).toEqual({ event: "started", flow_id: ids[0], entry: "reminder" })
    expect(sent()[3]).toMatchObject({ abandon_cause: "left", last_step: "show" })
  })

  it("starts nothing while inactive, and a new attempt each time it turns active", () => {
    render(<Backup initiallyOpen={false} />)
    expect(trackFlowEvent).not.toHaveBeenCalled()

    act(() => controls.setOpen(true))
    act(() => controls.setStep("show"))
    act(() => controls.setOpen(false))
    act(() => controls.setOpen(true))

    expect(lifecycles()).toEqual([
      "started",
      "step_viewed",
      "step_viewed",
      "abandoned",
      "started",
      "step_viewed",
    ])
    expect(sent()[5]).toMatchObject({ step: "show" })
  })

  it("completes the modal it wraps: modal_closed reads completed, and no abandoned follows", () => {
    const { getByText } = render(<Backup />)

    fireEvent.click(getByText("finish"))

    expect(lifecycles()).toEqual(["started", "step_viewed", "completed"])
    expect(sent()[2]).toMatchObject({ verified: true })
    expect(closes()).toEqual(["completed"])
  })

  it("keeps a caller flow's modal open to the gesture after submitted: only completed finishes it", () => {
    render(<Backup />)

    act(() => flows.recovery_phrase_backup.submitted())
    fireEvent.keyDown(window, { key: "Escape" })

    expect(lifecycles()).toEqual(["started", "step_viewed", "submitted", "abandoned"])
    expect(closes()).toEqual(["escape"])
  })

  it("leaves the modal to its gesture when a flow nested in it completes", () => {
    const VaultSign = () => {
      useFlow(flows.vault_sign, { entry: "wallet", step: "scan_signature" })
      return null
    }
    render(
      <>
        <Backup />
        <VaultSign />
      </>
    )

    act(() => flows.vault_sign.completed())
    fireEvent.keyDown(window, { key: "Escape" })

    expect(closes()).toEqual(["escape"])
  })

  it("abandons on Escape, with modal_closed reading escape", () => {
    render(<Backup />)
    act(() => controls.setStep("show"))

    fireEvent.keyDown(window, { key: "Escape" })

    expect(lifecycles()).toEqual(["started", "step_viewed", "step_viewed", "abandoned"])
    expect(sent()[3]).toMatchObject({ abandon_cause: "left", last_step: "show" })
    expect(closes()).toEqual(["escape"])
  })

  it("puts the running flow on error_shown, and the error on a later abandoned", () => {
    const { unmount } = render(<Bound step="show" />)

    reportErrorShown({ surface: "field", category: "wrong_password" })
    unmount()

    const [{ flow_id }] = sent()
    expect(track).toHaveBeenCalledWith("error_shown", {
      surface: "field",
      error_category: "wrong_password",
      flow: PILOT,
      flow_id,
    })
    expect(sent().at(-1)).toMatchObject({ event: "abandoned", error_category: "wrong_password" })
  })

  it("ignores a second useFlow while the flow runs, and leaves the first attempt alone", () => {
    render(<Bound step="show" />)
    render(<Bound step="verify" />)
    cleanup()

    expect(lifecycles()).toEqual(["started", "step_viewed", "abandoned"])
  })

  it("runs nothing for a null flow", () => {
    const Nothing = () => {
      useFlow(null as typeof flows.recovery_phrase_backup | null, {
        step: "show",
        entry: "settings",
      })
      return null
    }
    render(<Nothing />)

    expect(trackFlowEvent).not.toHaveBeenCalled()
  })

  it("reports nothing with no running attempt", () => {
    flows.recovery_phrase_backup.completed({ verified: true })
    flows.recovery_phrase_backup.failed(new Error("x"))

    expect(trackFlowEvent).not.toHaveBeenCalled()
  })

  it("retries after failed under the same attempt, then completes once", () => {
    const { unmount } = render(<Bound step="show" />)

    flows.recovery_phrase_backup.submitted()
    flows.recovery_phrase_backup.failed(new Error("Incorrect password"))
    flows.recovery_phrase_backup.submitted()
    flows.recovery_phrase_backup.completed({ verified: false })
    unmount()

    expect(lifecycles()).toEqual([
      "started",
      "step_viewed",
      "submitted",
      "failed",
      "submitted",
      "completed",
    ])
    expect(sent()[3]).toMatchObject({ error_category: "wrong_password", last_step: "show" })
  })

  it("sends a transaction flow's transaction with submitted, never as a property, and no abandoned after", () => {
    const transfer = (flows as unknown as Record<string, typeof flows.recovery_phrase_backup>)
      .transfer
    const Transfer = () => {
      useFlow(transfer, {} as never)
      return null
    }
    const { unmount } = render(<Transfer />)

    ;(transfer.submitted as (props: object) => void)({ transactionId: "0xabc" })
    unmount()

    expect(trackFlowEvent.mock.calls.map(([event]) => event)).toEqual([
      "transfer_started",
      "transfer_submitted",
    ])
    expect(trackFlowEvent.mock.calls[1][1]).not.toHaveProperty("transactionId")
    expect(trackFlowEvent.mock.calls[1][2]).toBe("0xabc")
  })
})
