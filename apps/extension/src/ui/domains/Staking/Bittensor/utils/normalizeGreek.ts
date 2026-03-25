// Maps Greek letters to their visually similar Latin equivalents for search matching.
// Subnet symbols use Greek letters (α, β, τ, etc.) that users will type as Latin (a, b, t, etc.)
const GREEK_TO_LATIN: Record<string, string> = {
  α: "a",
  β: "b",
  γ: "y",
  δ: "d",
  ε: "e",
  ζ: "z",
  η: "n",
  θ: "th",
  ι: "i",
  κ: "k",
  λ: "l",
  μ: "u",
  ν: "v",
  ξ: "x",
  ο: "o",
  π: "p",
  ρ: "p",
  σ: "s",
  ς: "s",
  τ: "t",
  υ: "u",
  φ: "f",
  χ: "x",
  ψ: "ps",
  ω: "w",
}

const greekRegex = new RegExp(`[${Object.keys(GREEK_TO_LATIN).join("")}]`, "g")

export const normalizeGreek = (str: string) =>
  str.replace(greekRegex, (ch) => GREEK_TO_LATIN[ch] ?? ch)
