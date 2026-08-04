# Design QA

- Source visual truth: `C:\Users\weiye\AppData\Local\Temp\codex-clipboard-d900c398-4d2a-44cd-a92f-21d3f27f9dfe.png`
- Implementation screenshot: `D:\home\backlog\backlog-glass-qa.png`
- Viewport: 380 px wide, full Windows work-area height
- State: unfinished tab selected, empty todo list, Chinese UI

## Full-view comparison evidence

The implementation preserves the reference hierarchy: brand toolbar, todo heading, glass composer, centered status tabs, date-list area, and fixed footer. The source contains populated todo groups while the implementation screenshot contains the real empty state, so row-density comparison is based on the implemented populated structure rather than identical screenshot content.

## Focused region comparison evidence

The toolbar, composer, tabs, footer, and glass surfaces were compared at original resolution. Toolbar icon sizing, hairline separators, muted gray typography, compact count badges, and translucent white surfaces follow the selected direction. The supplied Backlog product icon intentionally replaces the generated layered logo from the mockup.

## Findings

- No actionable P0/P1/P2 layout or interaction issues remain.
- Typography follows the reference's compact native-system hierarchy and uses zero letter spacing.
- Spacing, toolbar proportions, composer height, tab alignment, and footer placement match the selected structure.
- Windows 10 does not blur Acrylic as strongly as the generated mockup; the 97% glass base is an intentional readability fallback. macOS uses native Vibrancy.
- The empty state is centered and does not disturb the fixed footer or tab layout.
- No image assets were replaced with CSS drawings; the user-supplied bitmap logo and library icons are used.
- Copy is fully localized for Simplified Chinese and English, including settings and tray menus.

## Patches made

- Added native tray behavior and removed the main-window close action.
- Added system/Chinese/English language preference and persistence.
- Added NSIS install-directory selection.
- Rebuilt the visual surface around the selected frosted-glass mockup.
- Added clear-completed footer action and functional settings panel.
- Increased Windows glass base opacity after screenshot QA exposed background-content interference.

## Follow-up polish

- P3: verify native Vibrancy and tray-menu typography on macOS hardware.
- P3: capture a populated production state for row-level visual comparison.

final result: passed
