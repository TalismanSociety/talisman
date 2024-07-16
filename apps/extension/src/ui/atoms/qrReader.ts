import { BrowserCodeReader, BrowserQRCodeReader } from "@zxing/browser"
import { atom } from "jotai"

export const codeReaderAtom = atom(() => new BrowserQRCodeReader())

export const videoInputDevicesAtom = atom(
  async () => await BrowserCodeReader.listVideoInputDevices()
)

const _selectedVideoInput = atom<string | null>(null)
export const selectedVideoInputAtom = atom(
  async (get) => {
    const selectedId = get(_selectedVideoInput)
    if (selectedId !== null) return selectedId

    const devices = await get(videoInputDevicesAtom)
    return devices[0].deviceId
  },
  (_get, set, deviceId: string) => set(_selectedVideoInput, deviceId)
)
