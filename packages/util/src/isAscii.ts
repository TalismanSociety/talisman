export const isAscii = (str: string): boolean => {
  return [...str].every((char) => char.charCodeAt(0) <= 127)
}
