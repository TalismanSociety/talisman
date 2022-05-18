import React from "react"

interface IProps {
  onNext?: () => void
  children: any
  className: string
}

const defaultProps: IProps = {
  children: [],
  className: "",
}

const Stepper = ({ onNext, children, className }: IProps) => {
  return <span>{React.cloneElement(children, { next: onNext })}</span>
}

Stepper.defaultProps = defaultProps

export default Stepper
