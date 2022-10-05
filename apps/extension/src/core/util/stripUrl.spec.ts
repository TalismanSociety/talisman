import { Err, Ok } from "ts-results"
import { stripUrl } from "./stripUrl"

describe("Tests stripUrl function", () => {
  it("works", () => {
    expect(stripUrl("https://something.com/anything")).toEqual(Ok("something.com"))
    expect(stripUrl("https://something.com/anything?moreStuff=true&yes=more")).toEqual(
      Ok("something.com")
    )
    expect(stripUrl("Nope")).toEqual(Err("Invalid URL"))
    expect(stripUrl("7ca9d9e7-b68a-4d89-a4b1-a34d9766da3c.com")).toEqual(Err("Invalid URL"))
    expect(stripUrl("nope://something.com")).toEqual(Err("URL protocol unsupported"))
  })
})

// load bearing export
export {}
