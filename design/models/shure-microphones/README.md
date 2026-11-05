# Shure microphone and wireless receiver

The current revision has two separate equipment models:

- One Shure handheld wireless microphone matching the supplied silver-grille,
  black-handle front photo.
- A separate Shure BLX4 wireless receiver matching the supplied front-panel view.

Build the current revision:

```sh
blender -b -t 2 --python design/models/shure-microphones/build_wireless.py -- design/models/shure-microphones/wireless-generated
```

See [WIRELESS-REVISION.md](WIRELESS-REVISION.md) for asset locations and the
signed-in importer that updates `shure-mics` and creates
`shure-wireless-receiver` with its own model and Gallery artwork.

The previous `build_model.py` and Cloudinary dual-handheld/BLX88 set are historical
assets. They are not the current requested microphone or receiver design.
