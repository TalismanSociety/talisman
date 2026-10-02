import { cleanup, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { FormFieldContainer } from "./FormFieldContainer"

const track = vi.hoisted(() => vi.fn())
vi.mock("@ui/api/track", () => ({ track }))

const Field = ({ error, field, name }: { error?: string; field?: string; name?: string }) => (
  <FormFieldContainer error={error} field={field}>
    <input name={name} />
  </FormFieldContainer>
)

describe("FormFieldContainer error_shown", () => {
  beforeEach(() => track.mockClear())
  afterEach(cleanup)

  it("reports an error when it appears, with the input's name and never its text", () => {
    const { rerender } = render(<Field name="rpcs[0].url" />)
    rerender(
      <Field
        name="rpcs[0].url"
        error="Invalid address 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
      />
    )

    expect(track.mock.calls).toEqual([
      ["error_shown", { surface: "field", error_category: "input_invalid", field: "rpcs.0.url" }],
    ])
  })

  it("reports once while the same message stays, and again when it changes", () => {
    const { rerender } = render(<Field name="name" error="Required" />)
    rerender(<Field name="name" error="Required" />)
    rerender(<Field name="name" error="Too long" />)

    expect(track).toHaveBeenCalledTimes(2)
  })

  it("prefers the container's field, and reports no field when nothing names it", () => {
    render(<Field field="privateKey" error="Invalid" />)
    cleanup()
    render(<Field error="Invalid" />)

    expect(track.mock.calls.map(([, props]) => props.field)).toEqual(["privateKey", undefined])
  })

  it("ignores a blank message, which shows nothing", () => {
    render(<Field name="name" error=" " />)

    expect(track).not.toHaveBeenCalled()
  })

  it("takes the container's category when the error is not the field's own validation", () => {
    render(
      <FormFieldContainer error="Incorrect password" errorCategory="wrong_password">
        <input name="currentPw" />
      </FormFieldContainer>
    )

    expect(track).toHaveBeenCalledWith("error_shown", {
      surface: "field",
      error_category: "wrong_password",
      field: "currentPw",
    })
  })
})
