import { TEST } from "@common/constants"
import { bind } from "@react-rxjs/core"
import { BrowserCodeReader } from "@zxing/browser"
import { BehaviorSubject, combineLatest, from, map } from "rxjs"

import { debugObservable } from "./util/debugObservable"

const getCurrentTab = async () => {
  if (TEST) return null
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return currentTab
}

const [useCurrentTab, _currentTab$] = bind(
  from(getCurrentTab()).pipe(debugObservable("currentTab$"))
)

export const [useVideoInputDevices, videoInputDevices$] = bind(
  from(TEST ? [] : BrowserCodeReader.listVideoInputDevices()).pipe(
    debugObservable("videoInputDevices$")
  )
)

const selectedVideoInputId$ = new BehaviorSubject<string | null>(null)

export const setSelectedVideoInput = (deviceId: string) => {
  selectedVideoInputId$.next(deviceId)
}

const [useSelectedVideoInput, _selectedVideoInput$] = bind(
  combineLatest([selectedVideoInputId$, videoInputDevices$]).pipe(
    map(([selectedId, devices]) => (selectedId ? selectedId : devices[0].deviceId))
  )
)

export { useCurrentTab, useSelectedVideoInput }
