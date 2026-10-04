# Local review — 4 October 2026

Baseline c048e72: https://github.com/omarhalabi1510-glitch/albayt-website. Branch improve/content-and-photo-accuracy. Preview http://127.0.0.1:8765/. No production publication or Booking account modification.

## Evidence and corrections

Public source https://www.booking.com/hotel/il/hbyt-mas-39-ada.en-gb.html (Hebrew .he.html), Zimer Al-Bayt, property 3291992. Public listing and property dashboard read 4 October around 19:54–20:01 UTC. Only property details and review aggregates used; no guest export or session URLs included.

- Aggregate 8.9/10 from 104 reviews; previous website 8.7/90.
- Room 329199201 Double Room: up to 5, 1 single + 2 double beds. 329199202: up to 5, 2 single + 1 double + 1 sofa bed. 329199203 Family Suite: same capacity/beds. 329199204 Suite: up to 4, 1 single + 1 large double + 1 sofa bed.
- Booking title for 329199202 said Pool View. Owner explicitly confirmed no swimming pool anywhere. Local website now uses a neutral suite title. Booking itself was not edited.
- Owner confirmed room2.jpg is the shared lobby; it no longer illustrates a private room. Other interior pictures show general property character pending exact room mapping.
- Check-in 13:30–00:00, check-out 06:30–10:30, arrival arranged beforehand, minimum check-in age 18. Children welcome; free cot ages 0–2 on request subject to unit/availability; no extra beds listed; pets and parties prohibited. Booking cancellation/payment conditions depend on selected option.
- Continental breakfast listed, but current menu, price and inclusion require confirmation. Direct-booking terms also need owner confirmation. Old Wi-Fi feedback is not evidence of a current fault.

## Implementation

Must-fix: corrected photo association, no pool promise, dated rating/count with stale fallback, explicit capacity/beds, clearer policies and shared factual data for both languages.

Useful: responsive menu, keyboard-accessible gallery with focus restoration, skip link, RTL/LTR, room-specific source links, WhatsApp messages requesting dates and group details, optimized local photos, canonical/hreflang/sitemap and property structured data without stale rating. Original logo/colors preserved. No fake prices, availability, facilities or guest quotes.

Later: owner maps three interior images to units and confirms breakfast/direct terms. No folder setup is needed: all files and a contact sheet already exist. Historical Booking-hosted image provenance is recorded, but ownership/reuse permission still needs confirmation before publication.

## Validation

Three Python tests and three Node tests passed. They cover local links/assets/anchors, image labels, language and room parity, WhatsApp target/message, original photo hashes, and rating expiry/future/invalid input. JS syntax and git whitespace checks passed.

Browser: Hebrew 1440×1000, 768×1024, 390×844; English 1440×1000 and 390×844. No horizontal overflow at those measured sizes; no broken loaded images observed. Mobile menu opens/closes on navigation. Gallery opened, Hebrew ArrowLeft advanced 1→2, Escape closed it and focus returned to trigger. No console errors captured during local preview.

Screenshots: review/desktop-he.jpg, mobile-he.jpg, desktop-en.jpg, mobile-en.jpg and shared-lobby-mobile.jpg. These are focused checks, not full accessibility certification, Lighthouse results or cross-browser certification. No WhatsApp message, payment or reservation was sent. External link destinations were inspected, not all revisited end-to-end.

## Continue with Codex

Continue in the prepared branch, preserve the brand and original assets, and show Omar the local preview/contact sheet. Assign pictures to individual rooms only after his mapping. Incorporate confirmed breakfast/direct terms in both languages, rebuild and rerun checks. Keep dated score/count and stale fallback. Use live data only with verified source access and display rights. Obtain approval for the actual preview before any production push/deployment. Do not modify Booking.
