// import { Atom, atom, useAtomValue } from "jotai"
// import { useEffect, useMemo, useRef } from "react"

// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// type AtomValue<T extends Atom<any>> = T extends Atom<infer U> ? U : never

// // performance optimization utility
// // use this on top level page components to concurrently load all atoms required for first page rendering
// // TODO fix typings so each entry of the result has it's own type
// // eslint-disable-next-line @typescript-eslint/no-explicit-any
// export const usePreloadAtoms = <T extends Atom<any>[]>(...atoms: T) => {
//   throw new Error("this doesn't work yet")
//   // // dynamically create an atom that will load all the atoms concurrently
//   // // memoize to prevent infinite render loop
//   // const preloadAtom = useRef<Atom<Promise<Awaited<AtomValue<T[number]>>[]>>>()

//   // useEffect(() => {
//   //   if (preloadAtom.current) return
//   //   preloadAtom.current = atom((get) =>
//   //     Promise.all(atoms.map((atom) => get(atom) as AtomValue<T[number]>))
//   //   )
//   // }, [atoms, preloadAtom])

//   // // atom that never resolves, for first render
//   // const waitAtom = useMemo(() => atom(() => new Promise(() => {})), [])

//   // return useAtomValue(preloadAtom.current ?? waitAtom) as AtomValue<T[number]>[]
// }
