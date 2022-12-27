import { db } from "../../../db"
import ParaverseProtector from "./ParaverseProtector"

const mockGetCommitSha = jest.fn(async () => "newCommit")
const mockGetPolkadotData = jest.fn(async () => ({
  deny: ["badsite.com", "an.other-badsite.io"],
  allow: ["goodsite.com", "polkadot.js.org"],
}))
const mockGetPhishFortData = jest.fn(async () => ["alsobadsite.com", "really-badsite.io"])
const mockGetMetamaskData = jest.fn(() => require("eth-phishing-detect/src/config.json"))

jest.spyOn(ParaverseProtector.prototype, "getCommitSha").mockImplementation(mockGetCommitSha)
jest.spyOn(ParaverseProtector.prototype, "getPolkadotData").mockImplementation(mockGetPolkadotData)
jest
  .spyOn(ParaverseProtector.prototype, "getPhishFortData")
  .mockImplementation(mockGetPhishFortData)
jest.spyOn(ParaverseProtector.prototype, "getMetamaskData").mockImplementation(mockGetMetamaskData)
const protector = new ParaverseProtector()
// mock fire the ready event on the database
db.on.ready.fire(db)

it("Checks phishing sites", async () => {
  // in allow lists
  expect(await protector.isPhishingSite("https://www.goodsite.com")).toBeFalsy()
  expect(await protector.isPhishingSite("https://app.talisman.xyz")).toBeFalsy()
  // unlisted subdomain of domain in allow list
  expect(await protector.isPhishingSite("https://fake.talisman.xyz")).toBeFalsy()
  // not listed at all
  expect(await protector.isPhishingSite("https://something.else")).toBeFalsy()
  // in deny list
  expect(await protector.isPhishingSite("https://badsite.com"))
  expect(await protector.isPhishingSite("ws://badsite.com"))
  expect(await protector.isPhishingSite("https://an.other-badsite.io"))
  // unlisted subdomain of domain with another subdomain in deny list
  expect(await protector.isPhishingSite("https://safe.other-badsite.io")).toBeFalsy()
  // unlisted subdomain of domain in deny list
  expect(await protector.isPhishingSite("https://not-in-list.badsite.io"))

  // not a url
  expect(await protector.isPhishingSite("some garbage")).toBeFalsy()
})

it("Can add an exception to phishing sites", async () => {
  const badsite = "https://badsite.com"
  expect(await protector.isPhishingSite(badsite))
  protector.addException(badsite)
  expect(await protector.isPhishingSite(badsite)).toBeFalsy()
})

afterAll(() => {
  jest.clearAllMocks()
})
