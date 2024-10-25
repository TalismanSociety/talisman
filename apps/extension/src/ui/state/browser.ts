import { bind } from "@react-rxjs/core"
import { BrowserCodeReader } from "@zxing/browser"
import { TEST } from "extension-shared"
import { BehaviorSubject, combineLatest, from, map } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const getCurrentTab = async () => {
  if (TEST) return null
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return currentTab
}

export const [useCurrentTab, currentTab$] = bind(
  from(getCurrentTab()).pipe(debugObservable("currentTab$")),
)

export const [useVideoInputDevices, videoInputDevices$] = bind(
  from(TEST ? [] : BrowserCodeReader.listVideoInputDevices()).pipe(
    debugObservable("videoInputDevices$"),
  ),
)

const selectedVideoInputId$ = new BehaviorSubject<string | null>(null)

export const setSelectedVideoInput = (deviceId: string) => {
  selectedVideoInputId$.next(deviceId)
}

export const [useSelectedVideoInput, selectedVideoInput$] = bind(
  combineLatest([selectedVideoInputId$, videoInputDevices$]).pipe(
    map(([selectedId, devices]) => (selectedId ? selectedId : devices[0].deviceId)),
  ),
)
