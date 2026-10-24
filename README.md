# Persona 3 Reload portfolio

A portfolio styled after the Persona 3 Reload pause menu. Pure HTML, CSS and JavaScript: no build step, no dependencies.
Works on desktop (mouse + keyboard) and phones / tablets (tap + swipe).

## Run it

Serve the folder with any static server and open `index.html`:

```bash
python3 -m http.server 8000
```

Use a server rather than opening the file directly: the sound files are loaded with `fetch()`.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | All markup: loading screen, main menu, and the four pages (project, skills, about, contact). |
| `css/style.css` | Styles. Desktop design first, then one responsive layer at the end (tablet, portrait, phone, short landscape, touch, reduced motion, focus). The naming convention is documented at the top of the file. |
| `js/main.js` | Behaviour, in numbered sections (see the table of contents in its header comment). |
| `assets/` | Full-quality background clips, posters, favicon, profile photo. |
| `assets/lite/` | 720p / 30fps versions of the clips for phones and slow connections. |
| `sfx/`, `fonts/` | Sound effects and the Rodin / Skip fonts. |

## Where to change things

| I want to... | Edit |
| --- | --- |
| change my name, bio, quote | `index.html`, inside `#about-page` |
| change the e-mail address | `index.html`, the `a.p3r-mail-row` in `#contact-page` |
| add / change projects | `slinkData` in `js/main.js` (section 1) |
| add / change skills | `skillTabsList` and `skillGroupsData` in `js/main.js` (section 1) |
| change menu labels or their layout | `options` in `js/main.js` (section 1). Keep the same order as `PAGES` (section 8) |
| add a new page | add a `<section>` to `index.html`, a menu entry in `options`, and an entry in `PAGES` |
| replace a background clip | put the full version in `assets/` and a 720p one in `assets/lite/`, same file name |

## Behaviour worth knowing

- **Video quality tiers.** Phones, Save-Data, slow networks (3G or worse) and devices with 2 GB RAM or less get the clips in `assets/lite/` (about 90% fewer bytes). Everything else gets the originals. Force one with `?media=lite` or `?media=full`.
- **Autoplay policies.** Audio is created on the first tap or key press. On touch-only devices the loading screen ends on "TAP TO START" so the intro jingle and video can start from a real gesture. Set `REQUIRE_TAP_TO_START` to `false` in `js/main.js` to enter automatically instead.
- **Back button.** Each page adds one history entry (`#project`, `#skills`, ...), so the phone's Back button closes the page instead of leaving the site.
- **Reduced motion.** With "reduce motion" enabled in the OS, page transitions are near-instant and the big entrance animations are shortened.
- **Keyboard.** Arrow keys / W S to move, Enter or Space to confirm, Esc / B / Backspace to go back; Tab and Shift+Tab also work and keep the selection in sync. While a page is open the menu behind it is `inert`, and focus returns to the menu entry when the page closes.

## Debug URL parameters

| Parameter | Effect |
| --- | --- |
| `?page=project` `skills` `about` `contact` | open that page directly (`&tab=backend` selects a skills tab) |
| `?select=0..3` | preselect a menu entry |
| `?skip_loading=1` | skip the loading screen |
| `?media=lite` or `full` | force the video quality tier |

## Browser support

Current Chrome, Edge, Firefox and Safari (iOS 15.4+). Uses `clip-path` animation through the Web Animations API, `dvh` units (with a `vh` fallback) and the `inert` attribute (ignored by older browsers, which only loses the focus-trapping nicety).
