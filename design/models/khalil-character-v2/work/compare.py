import cv2, numpy as np, json, mediapipe as mp
ph=json.load(open('work/landmarks.json'))
def det(path):
    img=cv2.imread(path); h,w=img.shape[:2]
    with mp.solutions.face_mesh.FaceMesh(static_image_mode=True,refine_landmarks=True,max_num_faces=1,min_detection_confidence=.2) as fm:
        r=fm.process(cv2.cvtColor(img,cv2.COLOR_BGR2RGB))
    return img,np.array([[p.x*w,p.y*h] for p in r.multi_face_landmarks[0].landmark])
fi,fp=det('work/fit-front.png'); pho=cv2.imread('refs/khalil-front.png'); pp=np.array(ph['front']['pts'])[:,:2]
M,_=cv2.estimateAffinePartial2D(pp[:468].astype(np.float32),fp[:468].astype(np.float32))
warp=cv2.warpAffine(pho,M,(fi.shape[1],fi.shape[0]),borderValue=(98,105,115))
cv2.imwrite('work/cmp-front-side.png',cv2.resize(np.hstack([warp,fi]),None,fx=.6,fy=.6))
ed=cv2.Canny(cv2.cvtColor(warp,cv2.COLOR_BGR2GRAY),40,110); over=fi.copy(); over[ed>0]=(0,255,255); cv2.imwrite('work/cmp-front-edges.png',cv2.resize(over,None,fx=.6,fy=.6))
