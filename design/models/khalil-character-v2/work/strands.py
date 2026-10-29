"""Hair + beard as real strand geometry (curly tubes), rooted where the photos show hair/stubble."""
import numpy as np, cv2, json, sys
rng=np.random.default_rng(11)
V=np.load('work/fit_eval.npy'); T=np.load('work/uv_tris.npz'); tv,tu=T['tv'],T['tu']
G=json.load(open('work/groups.json')); zeye=json.load(open('work/cam.json'))['mid'][2]
tex=cv2.imread('out/khalil-skin-v2.png'); S=tex.shape[0]; alpha=np.load('work/tex_alpha.npy')
bl=cv2.GaussianBlur(tex,(0,0),5); lum=cv2.cvtColor(bl,cv2.COLOR_BGR2GRAY).astype(np.float32); sat=cv2.cvtColor(bl,cv2.COLOR_BGR2HSV)[...,1].astype(np.float32)/255
m_=np.load('work/lm_map.npz'); chin_z=float((m_['bw'][152][:,None]*V[m_['tri'][152]]).sum(0)[2])
skin_lum=143.0
# vertex normals
N=np.zeros_like(V); fn=np.cross(V[tv[:,1]]-V[tv[:,0]],V[tv[:,2]]-V[tv[:,0]])
for k in range(3): np.add.at(N,tv[:,k],fn)
N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-12)
earv=np.zeros(len(V),bool); earv[G['ears']]=True
cent=V[tv].mean(1); area=np.linalg.norm(fn,axis=1)/2
ok=(np.abs(cent[:,0])<0.125)&(cent[:,2]>zeye-0.20)&(cent[:,2]<zeye+0.13)&(~earv[tv].any(1))&(area>0)
idx=np.where(ok)[0]; p=area[idx]/area[idx].sum()
def candidates(n):
    t=rng.choice(idx,n,p=p); r1=np.sqrt(rng.random(n)); r2=rng.random(n); b=np.c_[1-r1,r1*(1-r2),r1*r2]
    pos=(b[:,:,None]*V[tv[t]]).sum(1); nrm=(b[:,:,None]*N[tv[t]]).sum(1); nrm/=np.linalg.norm(nrm,axis=1,keepdims=True)
    uv=(b[:,:,None]*tu[t]).sum(1); px=np.c_[uv[:,0]*(S-1),(S-1)-uv[:,1]*(S-1)].astype(int).clip(0,S-1)
    return pos,nrm,lum[px[:,1],px[:,0]],sat[px[:,1],px[:,0]],alpha[px[:,1],px[:,0]]
def build(n_hair,n_beard):
    pos,nrm,L,Sa,A=candidates(2500000)
    hairzone=(pos[:,2]>zeye+0.015)|((pos[:,2]>zeye-0.005)&(np.abs(pos[:,0])>0.055))|((pos[:,1]>-0.03)&(pos[:,2]>zeye-0.11))
    dark=np.where(A>.5,np.clip((skin_lum*.80-L)/(skin_lum*.28),0,1),1.0)
    ph=hairzone*dark
    lower=(pos[:,2]<zeye-0.024)&(pos[:,2]>chin_z-0.01)&(~hairzone)&(nrm[:,2]>-0.6)
    pb=lower*np.clip((skin_lum*.90-L)/(skin_lum*.26),0,1)*(Sa<.36)
    hi=np.where(rng.random(len(pos))<ph)[0]; bi=np.where(rng.random(len(pos))<pb)[0]
    hi=rng.choice(hi,min(n_hair,len(hi)),replace=False); bi=rng.choice(bi,min(n_beard,len(bi)),replace=False)
    print('hair roots',len(hi),'beard roots',len(bi))
    return (pos[hi],nrm[hi]),(pos[bi],nrm[bi])
def frame(d):
    a=np.where(np.abs(d[:,2:3])<.9,np.array([[0,0,1.]]),np.array([[1.,0,0]])); e1=np.cross(d,a); e1/=np.linalg.norm(e1,axis=1,keepdims=True); e2=np.cross(d,e1); return e1,e2
def strands(roots,kind,pts=9):
    pos,nrm=roots; n=len(pos); t=np.linspace(0,1,pts)[None,:,None]
    up=np.array([0,0,1.]); fwd=np.array([0,-1.,0]); dn=-up
    if kind=='hair':
        top=pos[:,2]>zeye+0.07; frontz=(pos[:,1]<-0.05)&(~top); back=pos[:,1]>-0.03
        L=np.where(top,0.019,np.where(frontz,0.014,np.where(back,0.011,0.008)))[:,None]*rng.uniform(.7,1.2,(n,1))
        d=nrm*.78+np.where(top[:,None],up*.22+fwd*.05,np.where(frontz[:,None],up*.25,dn*.20))
        grav=np.where(top,0.02,0.10)[:,None]; Rc,pitch,rad=0.0030,0.0058,0.00060
    else:
        L=np.where(pos[:,2]>zeye-0.05,0.0065,0.0085)[:,None]*rng.uniform(.7,1.25,(n,1))
        d=nrm*.75+dn*.35+np.array([0,0,0.]); grav=np.full((n,1),0.25); Rc,pitch,rad=0.0015,0.0036,0.00042
    j=rng.normal(0,1,(n,3)); d=d+j*(0.30 if kind=='hair' else 0.25)
    d/=np.linalg.norm(d,axis=1,keepdims=True)
    e1,e2=frame(d); phase=rng.uniform(0,2*np.pi,(n,1)); R=Rc*rng.uniform(.6,1.4,(n,1))
    # centre line bends with gravity; helix curl grows from the root
    ln=L[:,:,None]*t                                  # (n,pts,1) path length
    centre=pos[:,None,:]+d[:,None,:]*ln*0.9+(np.array([0,0,-1.])[None,None,:])*grav[:,:,None]*ln**2*8
    ang=2*np.pi*ln[...,0]/pitch+phase; amp=R*np.clip(t[...,0]*3.5,0,1)
    P=centre+(np.cos(ang)*amp)[:,:,None]*e1[:,None,:]+(np.sin(ang)*amp)[:,:,None]*e2[:,None,:]
    return P,rad
def tubes(P,rad,sides=3):
    n,m,_=P.shape; tan=np.gradient(P,axis=1); tan/=np.maximum(np.linalg.norm(tan,axis=2,keepdims=True),1e-9)
    a=np.where(np.abs(tan[...,2:3])<.9,np.array([0,0,1.]),np.array([1.,0,0])); n1=np.cross(tan,a); n1/=np.maximum(np.linalg.norm(n1,axis=2,keepdims=True),1e-9); n2=np.cross(tan,n1)
    r=rad*(1-.55*np.linspace(0,1,m))[None,:,None,None]
    ang=np.linspace(0,2*np.pi,sides,endpoint=False)
    ring=P[:,:,None,:]+r*(np.cos(ang)[None,None,:,None]*n1[:,:,None,:]+np.sin(ang)[None,None,:,None]*n2[:,:,None,:])
    verts=ring.reshape(-1,3); base=(np.arange(n)[:,None,None]*m*sides+np.arange(m-1)[None,:,None]*sides)
    f=[]
    for k in range(sides):
        k2=(k+1)%sides; a0=base+k; a1=base+k2; b0=a0+sides; b1=a1+sides
        f.append(np.stack([a0,a1,b1],-1).reshape(-1,3)); f.append(np.stack([a0,b1,b0],-1).reshape(-1,3))
    return verts.astype(np.float32),np.concatenate(f).astype(np.int32)
def colors(n,m,sides,base,var,tip,grey=0.0):
    c=np.array(base)[None,:]*rng.uniform(1-var,1+var,(n,1)); 
    if grey: g=rng.random(n)<grey; c[g]=np.array([0.55,0.45,0.36])*rng.uniform(.8,1.1,(g.sum(),1))
    t=np.linspace(0,1,m)[None,:,None]; col=c[:,None,:]*(0.65+0.35*t+tip*t**2)
    return np.repeat(col[:,:,None,:],sides,2).reshape(-1,3).clip(0,1).astype(np.float32)
if __name__=='__main__':
    nh=int(sys.argv[1]) if len(sys.argv)>1 else 16000; nb=int(sys.argv[2]) if len(sys.argv)>2 else 11000
    hr,br=build(nh,nb); out={}
    for name,roots,base,var,tip,grey in (('hair',hr,(.20,.13,.10),.35,.35,0.04),('beard',br,(.16,.105,.08),.35,.25,0.10)):
        P,rad=strands(roots,name); v,f=tubes(P,rad); col=colors(len(P),P.shape[1],3,base,var,tip,grey)
        out[f'{name}_v']=v; out[f'{name}_f']=f; out[f'{name}_c']=col; print(name,'strands',len(P),'verts',len(v),'tris',len(f))
    np.savez_compressed('work/strands.npz',**out)
