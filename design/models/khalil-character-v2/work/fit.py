"""Fit MPFB face targets to the two photos: front landmarks (2D) + hand-read profile depths + skull/ear extremes."""
import json, gzip, glob, os, re, numpy as np
from scipy.optimize import lsq_linear
ROOT='/home/rudy/.local/opt/mpfb2-2.0.18/src/mpfb/data/targets'
V=np.load('work/base_eval.npy'); N=len(V)
m=np.load('work/lm_map.npz'); vidx=m['vidx']; TRI=m['tri']; BW=m['bw']
ph=json.load(open('work/landmarks.json')); Q=np.array(ph['front']['pts'])[:,:2]   # photo px (u,v)
groups=json.load(open('work/groups.json'))
SKIP=('head-age','head-fat','head-angle','head-trans','measure-','chin-jaw-drop','neck-trans','-trans-in','-trans-out')
def tie(name): return re.sub(r'^(l|r)-','',name)
files={}
for sub in ('head','nose','mouth','chin','cheek','ears','eyes','eyebrows','forehead','neck'):
    for f in sorted(glob.glob(f'{ROOT}/{sub}/*.target.gz')):
        name=os.path.basename(f)[:-10]
        if any(s in name for s in SKIP): continue
        files[name]=f
def load(path):
    d=np.zeros((N,3))
    for l in gzip.open(path,'rt'):
        if l.strip() and not l.startswith('#'):
            r=l.split(); d[int(r[0])]=[float(r[1]),float(r[2]),float(r[3])]
    return d*0.1
groupsT={}
for name,f in files.items(): groupsT.setdefault(tie(name),[]).append(name)
names=sorted(groupsT); D=np.zeros((len(names),N,3))
for k,g in enumerate(names):
    for n in groupsT[g]: D[k]+=load(files[n])
print('parameters',len(names))
# ---- correspondences ------------------------------------------------------------------------
use=[i for i in range(468) if vidx[i]>=0]
vi=vidx[use]; q=Q[use]; use_a=np.array(use)
def lmpos(w,ids):
    ids=np.atleast_1d(ids); t=TRI[ids]; b=BW[ids][:,:,None]
    return (b*(V[t]+np.tensordot(w,D[:,t.reshape(-1),:],axes=(0,0)).reshape(len(ids),3,3))).sum(1)
def lmD(ids):   # (params, len(ids), 3) interpolated target deltas
    ids=np.atleast_1d(ids); t=TRI[ids]; b=BW[ids][None,:,:,None]
    return (b*D[:,t.reshape(-1),:].reshape(len(names),len(ids),3,3)).sum(2)
def lmV(ids): return lmpos(np.zeros(len(names)),ids)
def pos(w,idx): return V[idx]+np.tensordot(w,D[:,idx,:],axes=(0,0))
# photo scale/rotation/translation (similarity) to model x,z, refit each pass
def similarity(P,M):
    Pc=P-P.mean(0); Mc=M-M.mean(0)
    a=np.sum(Pc[:,0]*Mc[:,0]+Pc[:,1]*Mc[:,1]); b=np.sum(Pc[:,0]*Mc[:,1]-Pc[:,1]*Mc[:,0]); den=np.sum(Pc**2)
    c,s=a/den,b/den; R=np.array([[c,-s],[s,c]]); return R,M.mean(0)-P.mean(0)@R.T@np.eye(2)*1 if False else (R,P.mean(0),M.mean(0))
EYE=(33,263); STOM=(13,14)
# profile (hand read): index -> forward px from the outer eye corner, weight
EYE_X=678.0
PROF={168:(818,1.0),1:(893,1.0),0:(836,.7),17:(805,.6),152:(815,.4),9:(826,.7)}
SUB_X=841.0
PROF_STOM=(803,.7)
PROF_EYE_Y,PROF_STOM_Y=584.,818.
BACK_PX,TOP_PX=560.,394.   # skull back / top relative to the eye (hair thickness removed)
EAR_W_PX=623.; EAR_TOP_PX,EAR_BOT_PX=15.,178.  # front photo: ear outer width; ear top above / bottom below the eye row
ears=np.array(groups['ears']); L=ears[V[ears,0]>0]; Rr=ears[V[ears,0]<0]
head_sel=np.where((V[:,2]>lmV(33)[0,2]-0.12)&(V[:,2]<lmV(33)[0,2]+0.2)&(np.abs(V[:,0])<0.12))[0]
i_back=head_sel[np.argmax(V[head_sel,1])]; i_top=head_sel[np.argmax(V[head_sel,2])]
iL_out,iR_out=L[np.argmax(V[L,0])],Rr[np.argmin(V[Rr,0])]
iL_top,iL_bot=L[np.argmax(V[L,2])],L[np.argmin(V[L,2])]
iR_top,iR_bot=Rr[np.argmax(V[Rr,2])],Rr[np.argmin(V[Rr,2])]
SIL={int(k):v for k,v in json.load(open('work/silhouette.json')).items()}
def sil_rows():
    out=[]
    for v,(l,r) in SIL.items():
        if 260<=v<=520: off=20     # hair outline
        elif 800<=v<=950: off=16   # beard outline
        elif 1000<=v<=1040: off=0  # neck
        else: continue
        out.append((v,l,r,off))
    return out
SROWS=sil_rows()
headset=np.where((V[:,2]>lmV(152)[0,2]-0.10)&(V[:,2]<lmV(33)[0,2]+0.2)&(np.abs(V[:,0])<0.14))[0]
earset=set(groups['ears']); headset=np.array([i for i in headset if i not in earset])
def solve(lam,iters=6,verbose=True):
    w=np.zeros(len(names))
    for it in range(iters):
        M=lmpos(w,use_a)[:,[0,2]]; P=q*np.array([1,-1.0])
        Pc,Mc=P-P.mean(0),M-M.mean(0)
        a=np.sum(Pc*Mc); b=np.sum(Pc[:,0]*Mc[:,1]-Pc[:,1]*Mc[:,0]); den=np.sum(Pc**2)
        c,s_=a/den,b/den; R=np.array([[c,-s_],[s_,c]]); sc=np.hypot(c,s_)           # m / px
        mapP=lambda p:(p*np.array([1,-1.0])-P.mean(0))@R.T+M.mean(0)
        Dl=lmD(use_a); Vl=lmV(use_a)
        rows=[];rhs=[]
        # (a) 2D front landmarks
        T=mapP(q)
        for ax in (0,2):
            J=Dl[:,:,ax].T; r=T[:,0 if ax==0 else 1]-Vl[:,ax]; rows.append(J); rhs.append(r)
        # (a2) silhouette rows: extreme left/right vertices at the row's height must sit on the photo outline (hair/beard thickness removed)
        cur=V+np.tensordot(w,D,axes=(0,0))
        for v,l,r,off in SROWS:
            z=mapP(np.array([[500.,v]]))[0,1]
            cand=headset[np.abs(cur[headset,2]-z)<0.0025]
            if len(cand)<4: continue
            for side,u in ((1,r-off),(-1,l+off)):
                k=cand[np.argmax(side*cur[cand,0])]; xt=mapP(np.array([[u,v]]))[0,0]
                rows.append((2*D[:,k,0])[None,:]); rhs.append(np.array([2*(xt-V[k,0])]))
        # (b) profile depth: forward = y_eye - y_k
        eyeL=np.array([33,263]); sp=sc*np.hypot(*( (Q[list(STOM)].mean(0)-Q[list(EYE)].mean(0)) ))/(PROF_STOM_Y-PROF_EYE_Y)
        for k,(xpx,wt) in PROF.items():
            J=-(lmD(k)[:,0,1]-lmD(2)[:,0,1]); r=(xpx-SUB_X)*sp-(-(lmV(k)[0,1]-lmV(2)[0,1]))
            rows.append((J*wt*3)[None,:]);rhs.append(np.array([r*wt*3]))
        st=np.array([13,14]); J=-(lmD(st)[:,:,1].mean(1)-lmD(2)[:,0,1]); r=(PROF_STOM[0]-SUB_X)*sp+(lmV(st)[:,1].mean()-lmV(2)[0,1])
        rows.append((J*PROF_STOM[1]*3)[None,:]);rhs.append(np.array([r*PROF_STOM[1]*3]))
        # (c) skull and ears
        Jb=(D[:,i_back,1]-lmD(eyeL)[:,:,1].mean(1)); rb=(BACK_PX*sp)-(V[i_back,1]-lmV(eyeL)[:,1].mean())
        pass
        Jt=(D[:,i_top,2]-lmD(eyeL)[:,:,2].mean(1)); rt=(TOP_PX*sp)-(V[i_top,2]-lmV(eyeL)[:,2].mean())
        rows.append((Jt*2)[None,:]);rhs.append(np.array([rt*2]))
        Jw=(D[:,iL_out,0]-D[:,iR_out,0]); rw=EAR_W_PX*sc-(V[iL_out,0]-V[iR_out,0])
        rows.append((Jw*2)[None,:]);rhs.append(np.array([rw*2]))
        for (a_,s_sign,px) in ((iL_top,1,EAR_TOP_PX),(iR_top,1,EAR_TOP_PX),(iL_bot,-1,EAR_BOT_PX),(iR_bot,-1,EAR_BOT_PX)):
            J=(D[:,a_,2]-lmD(eyeL)[:,:,2].mean(1)); r=s_sign*px*sc-(V[a_,2]-lmV(eyeL)[:,2].mean())
            rows.append((J)[None,:]);rhs.append(np.array([r]))
        A=np.vstack(rows+[lam*np.eye(len(names))]); y=np.concatenate(rhs+[np.zeros(len(names))])
        res=lsq_linear(A,y,bounds=(0,1),max_iter=500)
        w=res.x
    return w,sc,sp
def report(w,sc,sp):
    M=lmpos(w,use_a)[:,[0,2]]; P=q*np.array([1,-1.0]); Pc,Mc=P-P.mean(0),M-M.mean(0)
    a=np.sum(Pc*Mc); b=np.sum(Pc[:,0]*Mc[:,1]-Pc[:,1]*Mc[:,0]); den=np.sum(Pc**2); c,s_=a/den,b/den; R=np.array([[c,-s_],[s_,c]])
    T=Pc@R.T+M.mean(0); err=np.linalg.norm(T-M,axis=1)*1000
    out=[]
    for k,(xpx,wt) in PROF.items():
        out.append((k,round(float(((xpx-SUB_X)*sp-(-(lmpos(w,k)[0,1]-lmpos(w,2)[0,1])))*1000),1)))
    return err.mean(),np.percentile(err,90),out
if __name__=='__main__':
    import sys
    lam=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
    w,sc,sp=solve(lam)
    em,e90,po=report(w,sc,sp); print('lam',lam,'front mean err mm',round(em,2),'p90',round(e90,2),'profile err mm',po,'saturated',int((w>.98).sum()),'nonzero',int((w>1e-3).sum()))
    M=pos(w,vi)[:,[0,2]]; 
    out={n:round(float(x),4) for n,x in zip(names,w) if x>1e-3}
    print('scale m/px',sc,'profile m/px',sp,'active',len(out))
    # residual of front landmarks in px
    P=q*np.array([1,-1.0]); 
    json.dump({'weights':out,'groups':{g:groupsT[g] for g in out},'sc':sc,'sp':sp},open('work/fit_weights.json','w'),indent=1)
    for n,x in sorted(out.items(),key=lambda t:-t[1])[:25]: print(f'{n:34s}{x:.3f}')
