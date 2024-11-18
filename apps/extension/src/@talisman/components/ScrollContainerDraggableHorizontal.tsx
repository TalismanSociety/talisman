import { classNames } from "@talismn/util"
import React, { MouseEvent, TouchEvent, useEffect, useRef, useState } from "react"

type ScrollContainerDraggableHorizontalProps = {
  children?: React.ReactNode
  className?: string
}

export const ScrollContainerDraggableHorizontal = ({
  children,
  className,
}: ScrollContainerDraggableHorizontalProps) => {
  const containerRef = useRef<HTMLDivElement>(null)

  // State to track dragging
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [startPosition, setStartPosition] = useState<number>(0)
  const [scrollLeft, setScrollLeft] = useState<number>(0)

  // State to track if there's more content to the left or right
  const [more, setMore] = useState<{ left: boolean; right: boolean }>({
    left: false,
    right: false,
  })

  useEffect(() => {
    const scrollable = containerRef.current
    if (!scrollable) return

    const handleDetectScroll = () => {
      setMore({
        left: scrollable.scrollLeft > 0,
        right: scrollable.scrollWidth - scrollable.scrollLeft > scrollable.clientWidth,
      })
    }

    // Attach event listeners
    scrollable.addEventListener("scroll", handleDetectScroll)
    window.addEventListener("resize", handleDetectScroll)

    // Initial detection
    handleDetectScroll()

    // Fix for initial load when scrollWidth might not be calculated yet
    setTimeout(handleDetectScroll, 50)

    // Cleanup
    return () => {
      scrollable.removeEventListener("scroll", handleDetectScroll)
      window.removeEventListener("resize", handleDetectScroll)
    }
  }, [])

  const handleDragStart = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
    containerRef.current?.classList.add("cursor-grabbing")
    const pageX = "touches" in e ? e.touches[0].pageX : e.pageX
    setStartPosition(pageX)
    setScrollLeft(containerRef.current?.scrollLeft || 0)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    containerRef.current?.classList.remove("cursor-grabbing")
  }

  const handleDragMove = (e: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.preventDefault()
    const pageX = "touches" in e ? e.touches[0].pageX : e.pageX
    const distance = pageX - startPosition
    if (containerRef.current) {
      containerRef.current.scrollLeft = scrollLeft - distance
    }
  }

  return (
    <div className="relative z-0 overflow-hidden">
      {/*   eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={containerRef}
        className={classNames(
          "no-scrollbar flex cursor-grab select-none overflow-x-auto",
          className,
        )}
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onMouseMove={handleDragMove}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onTouchMove={handleDragMove}
      >
        {children}
      </div>
      {/* Left gradient overlay */}
      <div
        className={`pointer-events-none absolute left-0 top-0 h-full w-12 bg-gradient-to-r from-black to-transparent transition-opacity duration-300 ${
          more.left ? "opacity-100" : "opacity-0"
        }`}
      ></div>
      {/* Right gradient overlay */}
      <div
        className={`pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-black to-transparent transition-opacity duration-300 ${
          more.right ? "opacity-100" : "opacity-0"
        }`}
      ></div>
    </div>
  )
}
