import { describe, expect, it } from "vitest"

import { classNames } from "./cn"

describe("classNames", () => {
  it("keeps text color and custom text-tiny size together", () => {
    expect(classNames("text-body-disabled text-tiny")).toBe("text-body-disabled text-tiny")
    expect(classNames("text-body-disabled text-tiny")).toBe("text-tiny text-body-disabled")
  })

  it("still resolves conflicting font sizes", () => {
    expect(classNames("text-tiny text-xs")).toBe("text-tiny")
    expect(classNames("text-tiny text-xs")).toBe("text-xs")
  })
})
