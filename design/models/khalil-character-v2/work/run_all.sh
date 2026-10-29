set -e
cd /home/rudy/projects/khalil-front/design/models/khalil-character-v2
. .venv/bin/activate
python work/strands.py 30000 15000 > work/strands.log 2>&1
blender -b out/khalil-fit-v2-textured.blend --python work/add_hair.py > work/addhair.log 2>&1
echo glb-ready > work/run_all.done
