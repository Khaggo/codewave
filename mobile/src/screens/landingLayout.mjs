export const LANDING_CTA_MIN_HEIGHT = 44

const LANDING_CONTENT_BOTTOM_GAP = 24
const LANDING_DOCK_BOTTOM_GAP = 12

const normalizeInset = (value) =>
  Number.isFinite(value) ? Math.max(0, value) : 0

export const buildLandingBottomLayout = ({ bottomInset = 0 } = {}) => ({
  contentPaddingBottom: LANDING_CONTENT_BOTTOM_GAP,
  dockPaddingBottom: LANDING_DOCK_BOTTOM_GAP + normalizeInset(bottomInset),
})
