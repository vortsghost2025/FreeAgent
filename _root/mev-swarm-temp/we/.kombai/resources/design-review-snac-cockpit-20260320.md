# Design Review Results: SNAC-v2 Cockpit

**Review Date**: 2026-03-20  
**URL**: http://187.77.3.56 (live VPS)  
**Source**: `S:\supreme-octo-computing-machine-main\ui\src\`  
**Focus Areas**: Visual Design, UX/Usability, Accessibility, Responsive Layout

## Summary

The Cockpit's structural intent is solid — a sidebar with input controls on the left and panels grid on the right — but a **stale deployed build** means the panels render as a single vertical column instead of the intended grid, making the page ~4910px tall. Several high-impact issues related to empty-state sizing and sidebar scroll further compound the usability burden, especially for a vision-impaired user.

---

## Issues

| # | Issue | Criticality | Category | Location |
|---|-------|-------------|----------|----------|
| 1 | **Deployed CSS is outdated**: `.panels-grid` in the built CSS uses `display: flex; flex-direction: column` but source uses `display: grid`. All panels stack vertically instead of side-by-side, making the page ~4910px tall. Run `npm run build` and redeploy. | 🔴 Critical | Build/Deploy | `ui/src/index.css:111` vs live `assets/index-DxGG1igt.css` |
| 2 | **Vite default `App.css` conflicts with cockpit layout**: `#root` has `max-width: 1280px; margin: 0 auto; padding: 2rem; text-align: center` from the starter template. This caps layout width and centers text globally, conflicting with the full-width cockpit intent. Clear all unused default styles. | 🔴 Critical | Visual Design | `ui/src/App.css:1–5` |
| 3 | **Timeline panel occupies ~2857px when empty**: `MemoryTimeline` renders a `.panel-content.timeline` with unbounded minimum height when no events exist. Shows only "No events yet." text but takes 2857px. Add `min-height: 300px; max-height: 600px; overflow-y: auto` to `.panel-content.timeline`. | 🟠 High | UX/Usability | `ui/src/index.css:797`, `ui/src/App.jsx:19–50` |
| 4 | **Sidebar has no independent scroll**: `.cockpit-sidebar` grows to full document height (4910px) with no `overflow-y: auto`. Users must scroll the entire page to reach bottom sidebar sections. Set `height: calc(100vh - [header height]); overflow-y: auto; position: sticky; top: 0` on `.cockpit-sidebar`. | 🟠 High | UX/Usability | `ui/src/index.css:93–101` |
| 5 | **No visual hierarchy between primary and secondary buttons**: All action buttons ("Run Agent", "Ingest Document", "Ingest Thought", etc.) use identical flat styling. There is no primary/secondary visual distinction. Primary submit actions should use `--accent-blue` fill; secondary actions should be ghost/outline styled. | 🟡 Medium | Visual Design | `ui/src/index.css:155–180, 215–240` |
| 6 | **No section dividers in sidebar for low-vision navigation**: Sidebar sections are separated only by `gap: 30px` with no visual rule or background contrast change. For a user with partial vision, sections blend together. Add a 1px `border-top: 1px solid var(--border)` separator or subtle background difference between each `.sidebar-section`. | 🟡 Medium | Accessibility | `ui/src/index.css:97, 119–130` |
| 7 | **Placeholder text contrast fails WCAG AA**: `--text-secondary: #94a3b8` on `--bg-tertiary: #334155` background yields ~2.4:1 contrast ratio. WCAG AA requires 3:1 for non-text UI elements (placeholders). Lighten placeholder to `#b0bec5` or darken input background to `#1e293b`. | 🟡 Medium | Accessibility | `ui/src/index.css:10–11` |
| 8 | **⛶ icon buttons have no `aria-label`**: Multiple "fullscreen/expand" buttons render as `⛶` characters with no accessible label. Screen readers announce it as a raw symbol. Add `aria-label="Expand"` (or equivalent) to each icon-only button. | ⚪ Low | Accessibility | `ui/src/App.jsx` (multiple locations) |
| 9 | **Unused Vite starter template styles in `App.css`**: `.logo`, `.card`, `.read-the-docs`, `@keyframes logo-spin` are left over from scaffolding. Remove all unused styles to reduce CSS weight and avoid accidental conflicts. | ⚪ Low | Visual Design | `ui/src/App.css:5–45` |
| 10 | **No sticky/fixed page header**: The cockpit header (SNAC-v2 Cockpit + Backend status badge) disappears on scroll. For a long page, losing the status indicator means the user can't see backend connectivity while interacting with bottom sections. Add `position: sticky; top: 0; z-index: 100` to `.cockpit-header`. | ⚪ Low | UX/Usability | `ui/src/index.css:56–65` |

---

## Criticality Legend
- 🔴 **Critical**: Breaks functionality or causes major layout failure
- 🟠 **High**: Significantly impacts usability, especially given vision accessibility needs
- 🟡 **Medium**: Noticeable quality-of-life issue that should be addressed
- ⚪ **Low**: Nice-to-have improvement

---

## Next Steps (Suggested Priority Order)

1. **Rebuild & Redeploy** — `cd S:\supreme-octo-computing-machine-main\ui && npm run build`, then push updated `dist/` to Docker container. This alone fixes issue #1 (the grid layout) and likely halves the page height.
2. **Clean `App.css`** — Delete all Vite default styles (Issue #2). Leave only the `#root { min-height: 100vh }` override if needed.
3. **Fix Timeline + Sidebar scroll** — Add `max-height` + `overflow-y: auto` to the timeline panel-content (#3), and make the sidebar sticky+scrollable (#4).
4. **Accessibility pass** — Fix placeholder contrast (#7) and add `aria-label` to icon buttons (#8).
5. **Polish** — Button hierarchy (#5), sidebar dividers (#6), sticky header (#10).

---

## Key Positive Notes

- ✅ Large base font size (17–19px) is excellent for low-vision users
- ✅ Meaningful empty-state messages in all sections ("No events yet", "No task history")
- ✅ Backend status badge (`Backend: ok`) is prominently visible in header
- ✅ Focus ring on inputs (`box-shadow: 0 0 0 3px rgba(59,130,246,0.35)`) is well-implemented
- ✅ `prefers-reduced-motion` media query is correctly applied
