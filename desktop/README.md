# Echo Studio desktop

The live studio in its own window, no browser needed. It loads the same studio page as the website, so every website deploy updates it.

## Test on Linux
```
cd desktop && npm install
npm run dev      # opens http://localhost:5176/admin/live-studio (run the site's `npm run dev` first)
npm start        # opens the live site, https://djkhalilnahhat.ca/admin/live-studio
```
Set `ECHO_STUDIO_URL` to open another address. Sign in once; the login is kept between runs.
If Linux complains about the sandbox, run `npx electron . --no-sandbox` for testing.
If `ELECTRON_RUN_AS_NODE` is set in your shell (some editors set it), run `env -u ELECTRON_RUN_AS_NODE npm start`.

## Build
- Mac (must be run on a Mac): `npm run dist:mac` makes `dist/Echo Studio-*.dmg`. For a copy that opens on other Macs it must be signed and notarized with an Apple Developer account (electron-builder reads `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`).
- Linux: `npm run dist:linux` makes an AppImage.
macOS asks once for camera and microphone access.
