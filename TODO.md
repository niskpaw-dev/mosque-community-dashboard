# TODO — Prayer Dashboard Refactor (Premium Smart Display)

- [x] Update `pages/index.html` hero area markup to match 3-zone UX:
  - [x] CURRENT ACTIVE PRAYER ("SEDANG BERLANGSUNG" + badge)
  - [x] NEXT UPCOMING PRAYER ("WAKTU SOLAT SETERUSNYA" + big prayer name + time)
  - [x] COUNTDOWN TO NEXT PRAYER (rings with JAM/MINIT/SAAT)

- [ ] Update `utils/app.js` to populate:
  - [ ] current active prayer badge = `state.currentPrayerName`
  - [ ] next upcoming prayer = `state.nextPrayerName` + `state.nextPrayerTime`
  - [ ] countdown rings = time remaining until `state.nextPrayerTime`
  - [ ] remove/avoid misleading mapping that currently writes currentPrayer.name into the hero
- [x] Update `components/PrayerCard.js` active row highlighting to reflect CURRENT ACTIVE PRAYER only

- [ ] Update `styles/style.css` with premium glassmorphism/futuristic hierarchy for new hero elements
- [ ] Manual test: with real fetched prayer times verify labels never swap (current ≠ next) and countdown always targets next prayer
