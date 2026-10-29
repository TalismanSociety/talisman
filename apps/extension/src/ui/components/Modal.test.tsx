import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { settleTransitions } from "../../../tests/settleTransitions"

import { Modal } from "./Modal"

const getBackdropOf = (content: string) =>
  [...document.body.querySelectorAll<HTMLElement>(".bg-grey-900\\/50")].find(
    (backdrop) => backdrop.nextElementSibling?.textContent === content
  )

describe("Modal backdrop", () => {
  afterEach(cleanup)

  it("blurs the page behind a modal, but not again behind a modal opened inside it", async () => {
    render(
      <Modal analyticsId="outer_modal" isOpen>
        outer
        <Modal analyticsId="inner_modal" isOpen>
          inner
        </Modal>
      </Modal>
    )
    await settleTransitions()

    expect(getBackdropOf("outer")?.classList).toContain("backdrop-blur-xs")
    expect(getBackdropOf("inner")?.classList).not.toContain("backdrop-blur-xs")
  })
})
