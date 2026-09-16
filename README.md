# Khalil Nahhat Frontend

Premium multi-route DJ portfolio and booking website for Khalil Nahhat, built with React, Vite, JavaScript, and custom CSS.

## Routes

```text
/
/live
/archive
/dates
/services
/contact
/login
/dashboard
/dashboard/services
/admin/live-stream
/admin/live-sessions
/admin/archive
/admin/services
```

Render rewrites direct requests to `index.html`, allowing every pathname to work on refresh while React renders only the requested page.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production build

```bash
npm run build
```

## Folder structure

```text
src/
  assets/images/
  components/
  data/siteData.js
  hooks/
  pages/HomePage.jsx
  styles/
```

## Replace placeholder content

Edit all site copy, contact information, events, archive items, music categories, and booking options in `src/data/siteData.js`.

## Add real images

1. Place image files in `src/assets/images/`.
2. Import them in `src/data/siteData.js`.
3. Replace the placeholder image imports and object values.

## Add a real audio file

1. Add the audio file to `public/` or `src/assets/`.
2. Update `siteData.currentFrequency.audioSrc` in `src/data/siteData.js`.
3. Keep `audioFallbackDuration` set so the UI still renders safely if the file is removed.

## Booking form integration

The frontend posts to `VITE_BOOKING_API_URL` when available and falls back to an in-browser simulated success response if the API is unavailable.

To connect a real service later:

1. Replace the fallback in `src/components/BookingForm.jsx` with Formspree, EmailJS, or a custom API call.
2. Set `VITE_BOOKING_API_URL` in a `.env` file for a live backend endpoint.

## Accessibility notes

- Semantic sections and labeled form controls are included.
- Keyboard access is supported for navigation, archive modal, and booking interactions.
- Reduced-motion preferences disable non-essential animation.

## Deploying to Render

1. Set the build command to `npm run build`.
2. Set the publish directory to `dist`.
3. Add a rewrite from `/*` to `/index.html`.

## Deploying to Vercel

1. Import the project.
2. Use the default Vite settings.
3. Add `VITE_BOOKING_API_URL` in project environment variables if using a live backend.
