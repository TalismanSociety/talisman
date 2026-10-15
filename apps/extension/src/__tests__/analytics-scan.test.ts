// biome-ignore-all lint/suspicious/noTemplateCurlyInString: the fixtures are template-literal source text
import { describe, expect, it } from "vitest"

import {
  callArguments,
  emittersIn,
  flowUsesIn,
  providerCalls,
  routePathsIn,
  stepStateHits,
  stripComments,
} from "./analyticsScan"

describe("stripComments", () => {
  it("blanks line and block comments and keeps strings and line numbers", () => {
    const code =
      'track("a") // track("b")\n/* track("c")\n */ const url = "https://x.test/track(\\"d\\")"'
    const stripped = stripComments(code)
    expect(emittersIn(stripped).literal).toEqual(["a"])
    expect(stripped.split("\n")).toHaveLength(3)
    expect(stripped).toContain("https://x.test")
  })
})

describe("emittersIn", () => {
  it("finds literals, envelopes and non-literal calls", () => {
    const code =
      'track("$screen", {})\ntrack(name)\nparseTrackedEvent({ event: "analytics_opt_in" })\ntrackFlowEvent(x)'
    expect(emittersIn(code)).toEqual({
      literal: ["$screen"],
      dynamic: [2],
      envelope: ["analytics_opt_in"],
    })
  })
})

describe("flowUsesIn", () => {
  it("sees a bound step and the reports, not a flow named in a string", () => {
    const code = [
      "useFlow(flows.send, { step, entry })",
      "useFlow(flows.swap, { entry })",
      "flows.send.completed()",
      "<Button onError={flows.send.failed} />",
      'const x = "flows.swap.completed("',
    ].join("\n")
    const uses = flowUsesIn(stripComments(code))
    expect(uses.useFlow).toEqual(["send", "swap"])
    expect(uses.boundSteps).toEqual(["send"])
    expect(uses.reports.map((r) => `${r.flow}.${r.method}`)).toEqual(
      expect.arrayContaining(["send.completed", "send.failed"])
    )
  })

  it("counts parentheses for call arguments", () => {
    expect(callArguments("a(b(c), d) e", 1)).toBe("b(c), d")
  })
})

describe("guard 2 rules", () => {
  it.each([
    ["const [{ step, hash }, setState] = useState(init)", "S1_destructured_step"],
    ["const [stage, setStage] = useState(Stages.A)", "S1_destructured_step"],
    ["type S = { step: WizardStep }", "S2_step_member"],
    ["const [state, dispatch] = useReducer(reducer, init)", "S3_reducer"],
    ["navigate(`/send/${page}?x=1`)", "S4_page_route"],
  ])("finds step state in %s", (code, rule) => {
    expect(stepStateHits(code)).toContain(rule)
  })

  it.each([
    ["const [open, setOpen] = useState(false)"],
    ["const step = 3"],
    ["const x = { stepper: 1 }"],
  ])("leaves %s alone", (code) => {
    expect(stepStateHits(code)).toEqual([])
  })

  it("finds provideContext calls across lines", () => {
    const code =
      "export const [\n  SendProvider,\n  useSend,\n] = provideContext(\n  useSendProvider\n)"
    expect(providerCalls(code).map((call) => [call.provider, call.hook])).toEqual([
      ["SendProvider", "useSendProvider"],
    ])
  })
})

describe("routePathsIn", () => {
  it("reads path props whatever their position in the tag", () => {
    const code = [
      '<Route element={<Page a={1} />} path="late" />',
      "<Route path={`${A}/:id`} element={<B />} />",
      "<Route index element={<C />} />",
      "<Route path={`${id}/*`}\n  element={<D />} />",
    ].join("\n")
    expect(routePathsIn(code).map(({ text, kind }) => [text, kind])).toEqual([
      ["late", "literal"],
      ["${A}/:id", "template"],
      ["${id}/*", "template"],
    ])
  })
})
