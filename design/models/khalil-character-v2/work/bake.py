"""Project the front + profile photos onto the fitted head and bake a 2048 UV skin texture."""
import cv2, json, numpy as np
S=2048
V=np.load('work/fit_eval.npy'); T=np.load('work/uv_tris.npz'); tv,tu=T['tv'],T['tu']
m=np.load('work/lm_map.npz'); TRI=m['tri']; BW=m['bw']
ph=json.load(open('work/landmarks.json')); Q=np.array(ph['front']['pts'])[:,:2]
front=cv2.imread('refs/khalil-front.png'); prof=cv2.imread('refs/khalil-profile.png')
def lm(ids): ids=np.atleast_1d(ids); return (BW[ids][:,:,None]*V[TRI[ids]]).sum(1)
use=np.arange(468); Lm=lm(use)
# --- front: similarity photo px -> model (x,z)
P=Q[use]*np.array([1,-1.0]); M=Lm[:,[0,2]]; Pc,Mc=P-P.mean(0),M-M.mean(0)
a=np.sum(Pc*Mc); b=np.sum(Pc[:,0]*Mc[:,1]-Pc[:,1]*Mc[:,0]); den=np.sum(Pc**2); c,s=a/den,b/den; R=np.array([[c,-s],[s,c]])
Rinv=np.linalg.inv(R)
def to_front_px(X):   # X (n,3) -> (u,v)
    p=((X[:,[0,2]]-M.mean(0))@Rinv.T+P.mean(0))*np.array([1,-1.0]); return p
# --- profile camera from silhouette alignment (align_profile.py)
qp=json.load(open('work/profile_cam.json'))['q']
def to_prof_px(X_,mirror=False):
    X_=X_.copy()
    if mirror: X_[:,0]=-X_[:,0]
    th,ph,sc,u0,v0=qp
    Rz=np.array([[np.cos(th),-np.sin(th),0],[np.sin(th),np.cos(th),0],[0,0,1]]); Rx=np.array([[1,0,0],[0,np.cos(ph),-np.sin(ph)],[0,np.sin(ph),np.cos(ph)]])
    P=X_@(Rx@Rz).T; return np.c_[sc*(-P[:,1])+u0, sc*(-P[:,2])+v0]
bgf=np.median(np.concatenate([front[:60].reshape(-1,3),front[:200,:60].reshape(-1,3)]),axis=0); bgp=np.median(np.concatenate([prof[:60].reshape(-1,3),prof[:200,:60].reshape(-1,3)]),axis=0)
def notbg(col,bg): return (np.linalg.norm(col-bg,axis=1)>30).astype(np.float32)
# --- normals
N=np.zeros_like(V); fn=np.cross(V[tv[:,1]]-V[tv[:,0]],V[tv[:,2]]-V[tv[:,0]])
for k in range(3): np.add.at(N,tv[:,k],fn)
N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-12)
def sample(img,px):
    h,w=img.shape[:2]; x=np.clip(px[:,0],0,w-1.001); y=np.clip(px[:,1],0,h-1.001)
    x0=x.astype(int); y0=y.astype(int); fx=(x-x0)[:,None]; fy=(y-y0)[:,None]
    I=img.astype(np.float32); return (I[y0,x0]*(1-fx)*(1-fy)+I[y0,x0+1]*fx*(1-fy)+I[y0+1,x0]*(1-fx)*fy+I[y0+1,x0+1]*fx*fy)
tex=np.zeros((S,S,3),np.float32); wsum=np.zeros((S,S),np.float32); zmap=np.full((S,S),-9,np.float32); ymap=np.zeros((S,S),np.float32); onmesh=np.zeros((S,S),bool)
zeye=lm(33)[0,2]
hair_col=np.array([55,70,92],np.float32)  # BGR brown from the photo, refined below
for t in range(len(tv)):
    uvs=tu[t]*np.array([S,S-1]); uvs[:,1]=(S-1)-(tu[t][:,1]*(S-1))   # flip V
    x0=int(max(0,np.floor(uvs[:,0].min()))); x1=int(min(S-1,np.ceil(uvs[:,0].max()))); y0=int(max(0,np.floor(uvs[:,1].min()))); y1=int(min(S-1,np.ceil(uvs[:,1].max())))
    if x1<x0 or y1<y0: continue
    gx,gy=np.meshgrid(np.arange(x0,x1+1),np.arange(y0,y1+1)); pts_=np.c_[gx.ravel(),gy.ravel()].astype(np.float32)+.5
    p0,p1,p2=uvs; d=(p1[1]-p2[1])*(p0[0]-p2[0])+(p2[0]-p1[0])*(p0[1]-p2[1])
    if abs(d)<1e-9: continue
    l0=((p1[1]-p2[1])*(pts_[:,0]-p2[0])+(p2[0]-p1[0])*(pts_[:,1]-p2[1]))/d; l1=((p2[1]-p0[1])*(pts_[:,0]-p2[0])+(p0[0]-p2[0])*(pts_[:,1]-p2[1]))/d; l2=1-l0-l1
    ins=(l0>=-1e-4)&(l1>=-1e-4)&(l2>=-1e-4)
    if not ins.any(): continue
    L=np.c_[l0,l1,l2][ins]; vv=tv[t]; pos=L@V[vv]; nrm=L@N[vv]; nrm/=np.maximum(np.linalg.norm(nrm,axis=1,keepdims=True),1e-9)
    # head/neck only: above the shoulders
    keep=(pos[:,2]>zeye-0.26)&(np.abs(pos[:,0])<0.14)
    if not keep.any(): continue
    pos,nrm,Lk=pos[keep],nrm[keep],L[keep]; xs=pts_[ins][keep]
    wf=np.clip(-nrm[:,1],0,1)**2*(pos[:,1]<-0.0)          # faces the front camera (-y)
    wr=np.clip(-nrm[:,0],0,1)**2; wl=np.clip(nrm[:,0],0,1)**2   # subject right (-x) / left (+x) side
    # front photo only: the hand-read profile points did not fit one consistent camera, so the profile photo is not projected
    cf=sample(front,to_front_px(pos)); wf=wf*notbg(cf,bgf)
    cr=sample(prof,to_prof_px(pos)); cl=sample(prof,to_prof_px(pos,mirror=True))
    wr=wr*(pos[:,0]<0)*notbg(cr,bgp); wl=wl*(pos[:,0]>0)*notbg(cl,bgp)
    # the front photo is the sharpest/most frontal source; the profile photo covers the sides, ears and beard flanks
    fr=(1-np.clip(wf*1.5,0,1))**2   # profile photo only where the front photo is grazing
    w_=np.stack([wf*1.0,wr*fr,wl*fr],1); col=w_[:,0:1]*cf+w_[:,1:2]*cr+w_[:,2:3]*cl; ws=w_.sum(1)
    ix=xs[:,0].astype(int); iy=xs[:,1].astype(int)
    tex[iy,ix]+=col; wsum[iy,ix]+=ws; zmap[iy,ix]=pos[:,2]; ymap[iy,ix]=pos[:,1]; onmesh[iy,ix]=True
hair=np.median(front[190:260,330:690].reshape(-1,3),axis=0).astype(np.float32); skin=np.median(np.concatenate([front[640:700,300:380].reshape(-1,3),front[640:700,640:720].reshape(-1,3)]),axis=0).astype(np.float32)
print('hair BGR',hair,'skin BGR',skin)
alpha=np.clip((wsum-.03)/.30,0,1)[...,None]; alpha=alpha*alpha*(3-2*alpha)
photo=np.where(wsum[...,None]>1e-4,tex/np.maximum(wsum[...,None],1e-4),skin)
# which texels are scalp / back of head? use the baked per-texel height
import numpy as np
np.save('work/tex_alpha.npy',alpha[...,0]); np.save('work/tex_z.npy',zmap); np.save('work/tex_y.npy',ymap); np.save('work/tex_on.npy',onmesh); np.save('work/tex_hair_skin.npy',np.stack([hair,skin]))
np.save('work/tex_photo.npy',photo)
print('alpha mean',float(alpha.mean()))
