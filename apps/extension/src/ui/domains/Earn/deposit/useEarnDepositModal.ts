import { createGlobalOpenClose } from "@talisman/hooks/createGlobalOpenClose"

import { EarnDepositWizardInit } from "./context"

export const [useEarnDepositModal] = createGlobalOpenClose<EarnDepositWizardInit>()

// const useTest = createGlobalOpenClose<EarnDepositWizardInit | null>(null)

// const initValue = new BehaviorSubject<EarnDepositWizardInit | null>(null)
// const [useInitValue] = bind(() => initValue.asObservable())

// export const useEarnDepositModal = () => {
//   const value = useInitValue()

//   const { isOpen, close, open: innerOpen } = useGlobalOpenClose("earn-deposit-wizard-modal")

//   const open = useCallback(
//     (init: EarnDepositWizardInit) => {
//       initValue.next(init)
//       innerOpen()
//     },
//     [innerOpen],
//   )

//   return useMemo(
//     () =>
//       isOpen && !!value
//         ? ({ isOpen: true, open, close, value } as const)
//         : ({ isOpen: false, open, close, value: undefined } as const),
//     [isOpen, open, close, value],
//   )
// }
