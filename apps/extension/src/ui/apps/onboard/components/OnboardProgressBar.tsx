import { useOnboard } from "../context"

export const OnboardProgressBar = ({ stages = 3 }: { stages?: number }) => {
  const { stage } = useOnboard()

  if (!stage) return null
  return (
    <div className="flex w-[24rem] justify-center gap-8">
      {Array.from({ length: stages }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-36 rounded-lg bg-white ${stage !== i + 1 && "bg-opacity-[0.15]"}`}
        />
      ))}
    </div>
  )
}
