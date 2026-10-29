"""Fit the profile photo camera (yaw, pitch, scale, shift) by matching the model's facial silhouette to the photo's."""
import cv2, numpy as np, json
from scipy.optimize import least_squares
V=np.load('work/fit_eval.npy'); G=json.load(open('work/groups.json'))
img=cv2.imread('refs/khalil-profile.png'); h,w=img.shape[:2]
bg=np.median(np.concatenate([img[:60].reshape(-1,3),img[:200,:60].reshape(-1,3),img[:200,-60:].reshape(-1,3)]),axis=0)
mask=(np.linalg.norm(img.astype(float)-bg,axis=2)>26).astype(np.uint8); mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8))
rows=np.arange(540,1000,8); up=np.array([np.where(mask[v])[0].max() for v in rows],float)   # right-most foreground = nose/lips/chin outline
# model head vertices (exclude ears, neck below chin)
zeye=json.load(open('work/cam.json'))['mid'][2]
H=np.where((V[:,2]>zeye-0.17)&(V[:,2]<zeye+0.1)&(V[:,1]<0.02)&(np.abs(V[:,0])<0.13))[0]; X=V[H]
def proj(q,X):
    th,ph,sc,u0,v0=q
    Rz=np.array([[np.cos(th),-np.sin(th),0],[np.sin(th),np.cos(th),0],[0,0,1]]); Rx=np.array([[1,0,0],[0,np.cos(ph),-np.sin(ph)],[0,np.sin(ph),np.cos(ph)]])
    P=X@(Rx@Rz).T; return np.c_[sc*(-P[:,1])+u0, sc*(-P[:,2])+v0]
def contour(q):
    p=proj(q,X); out=np.full(len(rows),np.nan)
    for i,v in enumerate(rows):
        sel=np.abs(p[:,1]-v)<4
        if sel.sum()>3: out[i]=p[sel,0].max()
    return out
def resid(q):
    c=contour(q); r=c-up; r[np.isnan(r)]=80.; return np.clip(r,-80,80)
best=None
for th0 in (-0.3,0,.3):
    for ph0 in (-.2,0,.2):
        s=least_squares(resid,[th0,ph0,3500,290,6100],bounds=([-.6,-.5,3000,-4000,-4000],[.6,.5,4200,5000,9000]),diff_step=1e-3)
        if best is None or s.cost<best.cost: best=s
q=best.x; r=resid(q)
print('yaw %.1f pitch %.1f deg scale %.0f px/m  rms contour err %.1f px (%.1f mm)'%(np.degrees(q[0]),np.degrees(q[1]),q[2],np.sqrt((r**2).mean()),np.sqrt((r**2).mean())/q[2]*1000))
json.dump({'q':q.tolist()},open('work/profile_cam.json','w'))
vis=img.copy(); p=proj(q,X)
for u,v in p[::3]: cv2.circle(vis,(int(u),int(v)),1,(0,255,255),-1)
cv2.imwrite('work/profile-align.png',vis)
