import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NftImage } from "./NftImage"

const IMAGE = "https://example.com/nft.png"
const OTHER_IMAGE = "https://example.com/other.png"

const nftImage = () => screen.getByAltText("NFT")
const isPlaceholder = () => nftImage().getAttribute("src")?.includes("unknown-nft")

describe("NftImage", () => {
  it("shows the image once its URL arrives after mount", () => {
    const { rerender } = render(<NftImage alt="NFT" />)
    expect(isPlaceholder()).toBe(true)

    rerender(<NftImage alt="NFT" src={IMAGE} />)
    expect(nftImage().getAttribute("src")).toBe(IMAGE)
  })

  it("falls back to the placeholder when the image fails", () => {
    render(<NftImage alt="NFT" src={IMAGE} />)
    fireEvent.error(nftImage())
    expect(isPlaceholder()).toBe(true)
  })

  it("tries a new URL after the previous one failed", () => {
    const { rerender } = render(<NftImage alt="NFT" src={IMAGE} />)
    fireEvent.error(nftImage())

    rerender(<NftImage alt="NFT" src={OTHER_IMAGE} />)
    expect(nftImage().getAttribute("src")).toBe(OTHER_IMAGE)
  })
})
