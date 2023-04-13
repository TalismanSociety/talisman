import { MutableRefObject, useEffect, useRef, useState } from "react"

export const useImageLoaded = (): [
  MutableRefObject<HTMLImageElement | null>,
  boolean,
  () => void
] => {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement | null>(null)

  const onLoad = () => setLoaded(true)
  useEffect(() => {
    ref.current && ref.current.complete && onLoad()
  })

  return [ref, loaded, onLoad]
}
