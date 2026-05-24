# TODO

- [x] Remove duplicate/static “Jadual Solat” header from schedule card in `index.html` and `pages/index.html` (leave only `#prayerSchedule`).

- [x] Refactor `renderScheduleGrid()` in `components/PrayerCard.js` to render:
  - [ ] Single title (no duplicates)
  - [ ] Date info below title
  - [ ] Compact location chip below date
  - [x] Prayer rows with correct active row styling
- [x] Update/extend `styles/style.css` to match futuristic glassmorphism smart-display requirements (spacing, typography hierarchy, overflow safety, chip + row + active shimmer).

- [x] Validate in browser: no overlapping, correct hierarchy, no glow overflow, active prayer row stands out.

- [x] Refactor `utils/app.js` to remove legacy `renderPrayerCard()` + `renderProgressBar()` from the main update loop (avoid mixing current/next & duplicate renders).

- [x] Ensure schedule card rendering is done from the correct state (highlight CURRENT active prayer row only), without modifying NEXT focus or countdown.

- [ ] Sanity-check prayer-state edge cases (when now is exactly at boundary) so countdown never goes negative and state recalculates cleanly.
