import { getExecutionContext } from "./getExecutionContext"

/*
Used to check if the current page is a background page. 
It is useful for preventing the execution of certain code inside or outside of the background page.
*/
export const isBackgroundPage = () => getExecutionContext() === "background"
