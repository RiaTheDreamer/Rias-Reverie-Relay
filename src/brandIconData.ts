// Exact C5A-approved release artwork remains as separate files for auditable
// package hashes. The release build generates the matching embedded data URLs,
// so frontend startup never depends on runtime import.meta asset resolution.
export {
  REVERIE_RELAY_SIDEBAR_ICON_URL,
  REVERIE_RELAY_TAB_ICON_URL,
  REVERIE_RELAY_ICON_DATA_URL,
} from './brandIconData.generated'
