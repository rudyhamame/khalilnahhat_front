# Preflight photo wall

Asset: `/echo/preflight-performance-wall-v1.webp`, a 4×4 illustrated photographic contact sheet generated from the existing Khalil portrait. Original retained at `/home/rudy/.codex/generated_images/01a025ed-c971-7b61-9bb9-227076df04c6/exec-04f6e1d9-5a5c-40dc-8185-4228af1c1462.png`.

Prompt direction: same Khalil identity, natural skin and age, jade/black/navy/ivory/burgundy outfits, dark emerald concert lighting, exact 4×4 square grid without gutters or typography. Scenes cover controller, moving heads, truss/base plates, uplights, QSC speakers, Elite speakers, 18-inch subwoofer, Shure microphone, Soundcraft mixer, JBL concert system, smoke, cold sparks, dry ice, CO2 gun, LED wall and projector. Scenes are illustrative rather than exact product photography.

The cached atlas supplies 216 small background tiles. Web Audio measures the actual greeting waveform energy and low-frequency attacks to move alternating tiles in depth. No guessed BPM or independent beat timer. Reduced-motion users receive a static wall.

After preloading, greeting playback starts together with the 1.4-second wall-to-content transition. Audio remains mounted and continues over the visible app until its natural end. When autoplay is blocked, the entry button starts the same sequence; silent entry remains available. Reduced-motion users enter immediately without the movement.

Latest presentation: only the logo and “Welcome to Echo.” remain visible. Loading progress and status are announced accessibly. The logo serves as the sound-entry button when autoplay is blocked; failed playback still allows entry. Preflight finishes as soon as resource preparation completes; there is no added minimum display time.

Preflight completion is stored in tab-scoped sessionStorage (`echo-preflight-complete`). Once entry finishes, further full-page navigation and reloads in that tab skip preloading, greeting playback, the overlay and its transition. Both HTML entry points suppress the static startup placeholder for completed tabs. Normal browser HTTP caching continues to manage assets; application data still refreshes normally.
