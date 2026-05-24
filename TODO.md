# TODO - Futuristic Islamic Prayer Dashboard UI/UX refactor

- [ ] Add required layout sections to both `index.html` and `pages/index.html`:
  - [ ] Top centered Miladi + Hijri date
  - [ ] Subtitle: "Waktu Solat Seterusnya"
  - [ ] Current prayer focus: big prayer name + prayer time
  - [ ] Countdown timer section with 3 circular cards (JAM, MINIT, SAAT) + SVG progress rings
  - [ ] Additional prayer info section (schedule/announcement/status) styled to fit premium minimalist layout

- [ ] Update `styles/style.css` to match premium futuristic design:
  - [ ] Gold gradients + glow
  - [ ] Glassmorphism + backdrop blur
  - [ ] Fade-in transitions + pulse for active prayer
  - [ ] Mobile-first responsive spacing

- [ ] Update JS (`utils/app.js`) to drive new DOM ids:
  - [ ] Compute next prayer and remaining time every second
  - [ ] Update timer numbers (JAM/MINIT/SAAT)
  - [ ] Animate SVG progress rings
  - [ ] Update current prayer name + current prayer time

- [ ] Refactor or bypass components that currently render old layout:
  - [ ] Update `components/PrayerCard.js` / `components/ProgressBar.js` OR render directly in `utils/app.js`

- [ ] Quick manual test in browser:
  - [ ] Verify countdown updates every second
  - [ ] Verify rings animate smoothly
  - [ ] Verify responsive stacking
