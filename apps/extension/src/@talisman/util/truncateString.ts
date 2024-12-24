/* eslint import/no-anonymous-default-export: [2, {"allowArrowFunction": true}] */
export default (str?: string, start = 4, end = 4) =>
  str ? `${str.substring(0, start)}...${str.substring(str.length - end)}` : null
