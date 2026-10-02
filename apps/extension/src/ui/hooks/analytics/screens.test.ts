import type { PatternAwaits } from "@common/analytics/screenPattern"
import { describe, expect, it } from "vitest"

import { type ScreenRegistration, SETTLE_MS, settleScreen } from "./screens"

const route = (
  pattern: string,
  depth: number,
  at: number,
  awaits: PatternAwaits = "nothing"
): ScreenRegistration => ({ depth, joined: { pattern, awaits }, at })

describe("settleScreen", () => {
  it.each([
    ["nothing registered", [], [], 0, null],
    [
      "a shell screen wins over routes",
      [{ name: "/login" as const, at: 5 }],
      [route("/portfolio", 0, 1)],
      10,
      { name: "/login", at: 5 },
    ],
    [
      "the deepest route",
      [],
      [route("/portfolio", 0, 1, "descendant"), route("/portfolio/tokens", 1, 2)],
      3,
      { name: "/portfolio/tokens", at: 2 },
    ],
    [
      "the latest of equal depth",
      [],
      [route("/a", 1, 1), route("/b", 1, 2)],
      3,
      { name: "/b", at: 2 },
    ],
    [
      "a prefix splat waits for its descendant",
      [],
      [route("/portfolio", 0, 100, "descendant")],
      150,
      { wait: SETTLE_MS.descendant - 50 },
    ],
    [
      "a prefix splat settles",
      [],
      [route("/portfolio", 0, 100, "descendant")],
      100 + SETTLE_MS.descendant,
      { name: "/portfolio", at: 100 },
    ],
    [
      "a catch-all waits briefly for a redirect",
      [],
      [route("/portfolio", 1, 100, "redirect")],
      150,
      { wait: SETTLE_MS.redirect - 50 },
    ],
    [
      "a catch-all settles",
      [],
      [route("/portfolio", 1, 100, "redirect")],
      100 + SETTLE_MS.redirect,
      { name: "/portfolio", at: 100 },
    ],
  ] as const)("%s", (_, virtual, routes, now, expected) => {
    expect(settleScreen({ virtual, routes, now })).toEqual(expected)
  })
})
