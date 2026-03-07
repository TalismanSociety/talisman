import { Err, Ok } from "ts-results"

import { Errors, urlToDomain } from "./urlToDomain"

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
