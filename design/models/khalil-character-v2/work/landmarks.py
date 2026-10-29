import cv2, json, numpy as np, mediapipe as mp, sys
out={}
for name in ('front','profile'):
    img=cv2.imread(f'refs/khalil-{name}.png'); h,w=img.shape[:2]
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True,refine_landmarks=True,max_num_faces=1,min_detection_confidence=.3) as fm:
        r=fm.process(cv2.cvtColor(img,cv2.COLOR_BGR2RGB))
    if not r.multi_face_landmarks: print(name,'NO FACE'); continue
    pts=np.array([[p.x*w,p.y*h,p.z*w] for p in r.multi_face_landmarks[0].landmark])
    out[name]={'size':[w,h],'pts':pts.tolist()}
    vis=img.copy()
    for i,(x,y,_) in enumerate(pts): cv2.circle(vis,(int(x),int(y)),2,(0,255,255),-1)
    cv2.imwrite(f'work/lm-{name}.png',vis); print(name,'ok',len(pts))
json.dump(out,open('work/landmarks.json','w'))
