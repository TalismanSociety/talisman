import { bind } from "@react-rxjs/core"
import { BrowserCodeReader } from "@zxing/browser"
import { BehaviorSubject, combineLatest, from, map } from "rxjs"

const getCurrentTab = async () => {
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return currentTab
}

export const [useCurrentTab, currentTab$] = bind(from(getCurrentTab()))

export const [useVideoInputDevices, videoInputDevices$] = bind(
  from(BrowserCodeReader.listVideoInputDevices())
)

const selectedVideoInputId$ = new BehaviorSubject<string | null>(null)

export const setSelectedVideoInput = (deviceId: string) => {
  selectedVideoInputId$.next(deviceId)
}

export const [useSelectedVideoInput, selectedVideoInput$] = bind(
  combineLatest([selectedVideoInputId$, videoInputDevices$]).pipe(
    map(([selectedId, devices]) => (selectedId ? selectedId : devices[0].deviceId))
  )
)
