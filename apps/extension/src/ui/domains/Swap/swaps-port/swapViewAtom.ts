import { atom } from "jotai"

export const swapViewAtom = atom<"form" | "approve-recipient" | "approve-erc20" | "confirm">("form")
