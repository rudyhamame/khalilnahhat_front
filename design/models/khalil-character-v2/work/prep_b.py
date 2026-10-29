import cv2, json, numpy as np, mediapipe as mp
img=cv2.imread('work/base-front.png'); h,w=img.shape[:2]
with mp.solutions.face_mesh.FaceMesh(static_image_mode=True,refine_landmarks=True,max_num_faces=1,min_detection_confidence=.2) as fm:
    r=fm.process(cv2.cvtColor(img,cv2.COLOR_BGR2RGB))
pts=np.array([[p.x*w,p.y*h] for p in r.multi_face_landmarks[0].landmark])
cam=json.load(open('work/cam.json')); V=np.load('work/base_eval.npy'); F=np.load('work/faces.npy')
vidx=-np.ones(len(pts),int); depth=np.zeros(len(pts)); tri=-np.ones((len(pts),3),int); bw=np.zeros((len(pts),3))
A=V[F[:,0]];B=V[F[:,1]];C=V[F[:,2]]
for i,(u,v) in enumerate(pts):
    x=cam['cx']+(u-w/2)*cam['mpp']; z=cam['cz']-(v-h/2)*cam['mpp']
    # ray along +y from y=-5; barycentric in the (x,z) plane
    e1=(B-A)[:,[0,2]]; e2=(C-A)[:,[0,2]]; p=np.array([x,z])-A[:,[0,2]]
    d=e1[:,0]*e2[:,1]-e1[:,1]*e2[:,0]; ok=np.abs(d)>1e-12
    s=np.where(ok,(p[:,0]*e2[:,1]-p[:,1]*e2[:,0])/np.where(ok,d,1),-1); t=np.where(ok,(e1[:,0]*p[:,1]-e1[:,1]*p[:,0])/np.where(ok,d,1),-1)
    hit=ok&(s>=0)&(t>=0)&(s+t<=1)
    if not hit.any(): continue
    ys=(A[:,1]+s*(B-A)[:,1]+t*(C-A)[:,1]); k=np.where(hit)[0]; k=k[np.argmin(ys[k])]  # front-most (smallest y, camera at -y)
    w3=np.array([1-s[k]-t[k],s[k],t[k]]); vidx[i]=F[k][np.argmax(w3)]; depth[i]=ys[k]; tri[i]=F[k]; bw[i]=w3
np.savez('work/lm_map.npz',vidx=vidx,model_px=pts,depth=depth,tri=tri,bw=bw)
print('mapped',int((vidx>=0).sum()),'of',len(pts))
iris=pts[468]; ex=cam['cx']+(iris[0]-w/2)*cam['mpp']; ez=cam['cz']-(iris[1]-h/2)*cam['mpp']
print('iris world',round(ex,4),round(ez,4))
