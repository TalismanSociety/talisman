import WebFont from "webfontloader"

export type FontFamily =
  | "Surt"
  | "SurtExpanded"
  | "WhyteInktrapMedium"
  | "Inter"
  | "Unbounded"
  | "alien-runes"

export const preloadFonts = (families: FontFamily[]) => {
  // this will append a wf-loading class to html element while fonts are loading
  // and wf-active when they are loaded (or wf-inactive if error or timeout)
  // styles.css contains a rule to hide the #root element while wf-loading is on the html element
  // this ensure app initializes without delay, but that UI will only be visible once fonts are loaded

  WebFont.load({
    custom: { families },
    classes: true,
    events: false,
    timeout: 500, // default is 5000 but since all fonts are local, we can reduce this
  })
}
