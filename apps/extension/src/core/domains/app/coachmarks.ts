type CoachmarkDefinition = {
  /** Points at something that changed: a fresh install never knew the old way, so it never shows */
  announcesChange: boolean
}

const COACHMARKS = {
  popup_fullscreen_moved: { announcesChange: true },
} as const satisfies Record<string, CoachmarkDefinition>

export type CoachmarkId = keyof typeof COACHMARKS

export const getChangeAnnouncementCoachmarks = (): CoachmarkId[] =>
  (Object.keys(COACHMARKS) as CoachmarkId[]).filter((id) => COACHMARKS[id].announcesChange)
