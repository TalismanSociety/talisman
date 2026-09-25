import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PasswordStrength } from "./PasswordStrength"

const renderLabel = (password?: string) =>
  render(<PasswordStrength password={password} />).container.textContent

describe("PasswordStrength", () => {
  it("renders nothing for an empty password", () => {
    expect(renderLabel("")).toBe("")
    expect(renderLabel(undefined)).toBe("")
  })

  it("grades by length and character diversity", () => {
    expect(renderLabel("abc")).toBe("Weak")
    expect(renderLabel("Abcdef1")).toBe("Medium")
    expect(renderLabel("Abcdefghij1!")).toBe("Strong")
  })

  it("only counts OWASP symbols towards diversity", () => {
    expect(renderLabel("Abcdefghij1 ")).toBe("Medium")
    expect(renderLabel("Abcdefghij1é")).toBe("Medium")
  })
})
