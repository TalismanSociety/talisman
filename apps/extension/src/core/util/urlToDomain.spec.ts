import { Err, Ok } from "ts-results"
import { describe, expect, it } from "vitest"
import { Errors, urlToDomain, urlToOrigin } from "./urlToDomain"

describe("Tests urlToDomain function", () => {
  it("works", () => {
    expect(urlToDomain("https://something.com/anything")).toEqual(Ok("something.com"))
    expect(urlToDomain("https://something.com:3000/anything")).toEqual(Ok("something.com:3000"))
    expect(urlToDomain("https://something.com/anything?moreStuff=true&yes=more")).toEqual(
      Ok("something.com")
    )
    expect(urlToDomain("Nope").val).toEqual(Err(Errors.InvalidURL).val)
    expect(urlToDomain("7ca9d9e7-b68a-4d89-a4b1-a34d9766da3c.com").val).toEqual(
      Err(Errors.InvalidURL).val
    )
    expect(urlToDomain("nope://something.com").val).toEqual(Err(Errors.UnsupportedProtocol).val)
  })
})

describe("Tests urlToOrigin function", () => {
  it("keeps the scheme so origins sharing a host stay distinct", () => {
    expect(urlToOrigin("https://something.com/anything")).toEqual(Ok("https://something.com"))
    expect(urlToOrigin("http://something.com/anything")).toEqual(Ok("http://something.com"))
    expect(urlToOrigin("https://something.com:3000/anything")).toEqual(
      Ok("https://something.com:3000")
    )
    // URL.origin would be "null" for non-special schemes
    expect(urlToOrigin("ipfs://bafybeigdyrzt5s")).toEqual(Ok("ipfs://bafybeigdyrzt5s"))
    expect(urlToOrigin("Nope").val).toEqual(Err(Errors.InvalidURL).val)
    expect(urlToOrigin("nope://something.com").val).toEqual(Err(Errors.UnsupportedProtocol).val)
  })
})
