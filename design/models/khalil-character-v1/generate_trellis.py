"""Generate an unrigged mesh using Microsoft's hosted TRELLIS.2 demo.

Run with: uv run --with gradio_client python generate_trellis.py
The hosted demo's own quota/authentication rules still apply. No paid fallback.
"""
import argparse
from pathlib import Path
import shutil
from gradio_client import Client, handle_file


def main():
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference', type=Path, default=root / 'neutral-a-pose-front-v3-photo-reference.png')
    parser.add_argument('--resolution', choices=['512', '1024', '1536'], default='1536')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--output-dir', type=Path, default=root / 'generated')
    args = parser.parse_args()
    if not args.reference.is_file():
        parser.error('Reference image not found.')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    client = Client('microsoft/TRELLIS.2', download_files=str(args.output_dir))
    print('Preparing the neutral character reference.', flush=True)
    client.predict(api_name='/start_session')
    prepared = client.predict(input=handle_file(str(args.reference)), api_name='/preprocess_image')
    if isinstance(prepared, dict):
        prepared = prepared.get('path') or prepared.get('url')
    print(f'Requesting {args.resolution} reconstruction; this is not a rig.', flush=True)
    client.predict(image=handle_file(prepared), seed=args.seed, resolution=args.resolution,
                   ss_sampling_steps=20, shape_slat_sampling_steps=20,
                   tex_slat_sampling_steps=20, api_name='/image_to_3d')
    print('Exporting 300k-face GLB with 4096px materials.', flush=True)
    result = client.predict(decimation_target=300000, texture_size=4096, api_name='/extract_glb')
    source = result[1] if isinstance(result, (list, tuple)) else result
    if isinstance(source, dict):
        source = source['path']
    destination = args.output_dir / 'khalil-neutral-unrigged-v1.glb'
    if Path(source).resolve() != destination.resolve():
        if destination.exists():
            raise FileExistsError(f'Refusing to overwrite {destination}')
        shutil.copy2(source, destination)
    print(f'Generated UNRIGGED mesh: {destination}', flush=True)
    print('Next: inspect likeness, separate accessories, retopologize and rig in Blender.', flush=True)


if __name__ == '__main__':
    main()
