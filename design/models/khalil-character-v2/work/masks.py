"""Per-vertex hair / beard density from the photo-baked skin texture (dark = hair, dark stubble = beard)."""
import numpy as np, cv2, json
V=np.load('work/fit_eval.npy'); T=np.load('work/uv_tris.npz'); tv,tu=T['tv'],T['tu']
tex=cv2.imread('out/khalil-skin-v2.png'); S=tex.shape[0]; alpha=np.load('work/tex_alpha.npy'); y_tex=np.load('work/tex_y.npy')
zeye=json.load(open('work/cam.json'))['mid'][2]
uv=np.zeros((len(V),2)); seen=np.zeros(len(V),bool)
for t in range(len(tv)):
    for k in range(3):
        v=tv[t,k]
        if not seen[v]: uv[v]=tu[t,k]; seen[v]=True
px=np.c_[uv[:,0]*(S-1),(S-1)-uv[:,1]*(S-1)].astype(int).clip(0,S-1)
blur=cv2.GaussianBlur(tex,(0,0),6).astype(np.float32); gray=cv2.cvtColor(cv2.GaussianBlur(tex,(0,0),6),cv2.COLOR_BGR2GRAY).astype(np.float32)
lum=gray[px[:,1],px[:,0]]; a=alpha[px[:,1],px[:,0]]
skin_lum=np.median(lum[(V[:,2]>zeye-0.06)&(V[:,2]<zeye-0.02)&(np.abs(V[:,0])<0.03)&(V[:,1]<-0.1)])   # nose/cheek centre
print('skin lum',skin_lum,'min',lum.min())
head=(np.abs(V[:,0])<0.13)&(V[:,2]>zeye-0.20)&(V[:,2]<zeye+0.12)
front=V[:,1]<0.0
# scalp: above brows (front) or side/back zone; skin-coloured forehead stays bare
hairzone=(V[:,2]>zeye+0.015)|((V[:,2]>zeye-0.005)&(np.abs(V[:,0])>0.055))|((V[:,1]>-0.03)&(V[:,2]>zeye-0.11))
dark=np.clip((skin_lum*.78-lum)/(skin_lum*.30),0,1)           # photo says: dark here
scalp=np.where(a>.5,dark,1.0)*hairzone*head
# beard: lower face, dark stubble pixels, not on the neck below the jaw, not on lips
m_=np.load('work/lm_map.npz'); chin_z=float((m_['bw'][152][:,None]*V[m_['tri'][152]]).sum(0)[2])
lower=(V[:,2]<zeye-0.02)&(V[:,2]>chin_z-0.012)&(np.abs(V[:,0])<0.105)&head
beard=np.clip((skin_lum*.88-lum)/(skin_lum*.28),0,1)*lower*(~hairzone)
beard[(V[:,2]>zeye-0.022)]=0
print('scalp verts',int((scalp>.3).sum()),'beard verts',int((beard>.3).sum()),'chin z',chin_z)
np.savez('work/masks.npz',scalp=scalp.astype(np.float32),beard=beard.astype(np.float32),lum=lum)
# debug image: front and side scatter
img=np.full((900,1200,3),30,np.uint8)
def plot(ax,ox,ay):
    for i in np.where(head)[0][::2]:
        c=(int(40+215*scalp[i]),int(40),int(40+215*beard[i])) if (scalp[i]>.05 or beard[i]>.05) else (110,130,150)
        cv2.circle(img,(int(ox+V[i,ax]*3200),int(450-(V[i,2]-zeye)*3200)),2,c,-1)
plot(0,300,0)
for i in np.where(head)[0][::2]:
    c=(int(40+215*scalp[i]),40,int(40+215*beard[i])) if (scalp[i]>.05 or beard[i]>.05) else (110,130,150)
    cv2.circle(img,(int(900-V[i,1]*3200),int(450-(V[i,2]-zeye)*3200)),2,c,-1)
cv2.imwrite('work/masks-debug.png',img)
