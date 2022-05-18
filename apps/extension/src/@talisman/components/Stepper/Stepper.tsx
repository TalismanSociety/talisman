import { useState } from "react"
import Step from "./Step"

interface IProps {
  children: any[]
  className: string
}

const defaultProps: IProps = {
  children: [],
  className: "",
}

const Stepper = ({ children, className }: IProps) => {
  const [step, setStep] = useState(0)

  return <Step onNext={() => setStep(step + 1)}>{children[step]}</Step>
}

Stepper.defaultProps = defaultProps

export default Stepper
