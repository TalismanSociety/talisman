import { describe, expect, it } from "vitest"

import { cn } from "./cn"

describe("cn", () => {
  it("keeps text color and custom text-tiny size together", () => {
    expect(cn("text-body-disabled text-tiny")).toBe("text-body-disabled text-tiny")
    expect(cn("text-body-disabled", "text-tiny")).toBe("text-body-disabled text-tiny")
  })

  it("still resolves conflicting font sizes", () => {
    expect(cn("text-xs", "text-tiny")).toBe("text-tiny")
  })
})
