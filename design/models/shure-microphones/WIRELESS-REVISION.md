# Separate Shure handheld and BLX4 receiver

Revision based on the user's supplied microphone front photo and receiver screenshot.

- **Microphone:** one upright black handheld, rounded silver woven grille, silver
  grille band/collar, SHURE handle marking, green indicator, round power button,
  battery sleeve seam and bottom cap. There is no blue ring or bundled receiver.
- **Receiver:** a separate black Shure BLX4-style enclosure, one green A1 display,
  audio/ready indicators, group/channel selectors and power control. The rear is
  kept plain because no rear reference was supplied.

Visible shapes and markings follow the supplied images. Hidden surfaces and
dimensions are illustrative, not a measurement-accurate manufacturer CAD model.

## Build

```sh
blender -b -t 2 --python design/models/shure-microphones/build_wireless.py -- design/models/shure-microphones/wireless-generated
```

Editable Blender masters and joined GLBs are in `wireless-generated/`. Runtime
GLBs and preview PNGs are under `public/echo/models/`. Matching Gallery artwork
is under `design/equipment-artwork/images/`.

The existing `shure-mics` equipment ID is retained. A separate
`shure-wireless-receiver` equipment record is prepared with category `sound`,
brand/model `Shure BLX4`, and stock tracking off so availability is on request.
The task does not supply a rental price or an inventory count.

## Apply through the signed-in admin session

Open:

<http://localhost:5176/design/equipment-artwork/import.html?equipment=shure-mics,shure-wireless-receiver>

Choose **Apply 2 equipment models and artwork**. This uploads both GLBs and
Gallery images, updates only the existing microphone's model/artwork, and creates
the separate receiver entry. It checks for an existing receiver ID before
creating anything and can resume an interrupted import.

Publication is pending until the importer confirms both records. No backend
deployment is required; it uses the existing equipment and 3D upload APIs.
