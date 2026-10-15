import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { NftImage } from "./NftImage"

const IMAGE = "https://example.com/nft.png"
const OTHER_IMAGE = "https://example.com/other.png"

const nftImage = () => screen.getByAltText("NFT")
const isPlaceholder = () => nftImage().getAttribute("src")?.includes("unknown-nft")
const isPulsing = () =>
  screen.queryByAltText("Loading")?.classList.contains("animate-pulse") ?? false

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

  it("pulses while the image URL is still expected", () => {
    const { rerender } = render(<NftImage alt="NFT" isPending />)
    expect(isPulsing()).toBe(true)

    rerender(<NftImage alt="NFT" src={IMAGE} isPending={false} />)
    expect(isPulsing()).toBe(true)

    fireEvent.load(nftImage())
    expect(isPulsing()).toBe(false)
  })

  it("stays still when no image is expected", () => {
    render(<NftImage alt="NFT" />)
    expect(isPulsing()).toBe(false)
  })

  it("stops pulsing when the image fails", () => {
    render(<NftImage alt="NFT" src={IMAGE} />)
    expect(isPulsing()).toBe(true)

    fireEvent.error(nftImage())
    expect(isPulsing()).toBe(false)
  })
})
