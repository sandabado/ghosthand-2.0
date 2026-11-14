# Ghosthand Studio

An experimental portfolio for Chris Kyser and Jesse Gawlik, built as a dependency-free static web application.

## Run

```sh
npm run dev
```

Open http://localhost:4173. `PORT` can select another local port. Run `npm run check` for JavaScript syntax checks. The deployable application lives in `dist/`; no build step is needed.

## Experience

- Interactive spectral field with pointer response, an amplified mode, pause, reduced motion, and offscreen suspension.
- Filterable work gallery and keyboard-accessible case dialogs.
- Native capability accordions and responsive mobile navigation.
- Project brief creation, edit, copy, text download, and an email draft addressed to `hello@ghosthand.studio`.

The brief is processed in the browser. No form data is stored or sent by the site. Opening an email draft requires the visitor to send it from their email application.

## Content and assets

`dist/cases.js` holds project narratives adapted from the earlier Ghosthand source. Prior individual experience is attributed in each case; Knowledge Systems is identified as in development. The portfolio artwork is a set of new conceptual studies, not project screenshots or outcome evidence. Replace these with approved project artifacts as they become available.

The spectral hand is an existing generated mood image from the earlier project's `inspo/Lumo generated 2026-11-12 15.13.png`. The hand icon and abstract work illustrations are new design studies, not an approved final identity. Fonts are DM Sans and IBM Plex Mono, served through Google Fonts with system fallbacks.

The intended public brand domain is `ghosthand.studio`. The initial Sites version is private; domain connection and public launch have not been performed.

## Structure

- `dist/index.html` — page, accessible dialogs, portfolio visual studies
- `dist/style.css` — responsive visual design
- `dist/app.js` — navigation, filters, cases, brief flow
- `dist/field.js` — Canvas particle field
- `dist/cases.js` — editable case content
- `scripts/serve.mjs` — local static development server
- `.openai/hosting.json` — Sites identity and static output configuration
