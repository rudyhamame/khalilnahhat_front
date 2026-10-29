import numpy as np, cv2, json
S=2048
photo=np.load('work/tex_photo.npy'); alpha=np.load('work/tex_alpha.npy')[...,None]; z=np.load('work/tex_z.npy'); on=np.load('work/tex_on.npy'); hair,skin=np.load('work/tex_hair_skin.npy')
y=np.load('work/tex_y.npy'); zeye=json.load(open('work/cam.json'))['mid'][2]
rng=np.random.default_rng(3); noise=cv2.GaussianBlur(rng.normal(0,1,(S,S)).astype(np.float32),(0,0),2.2)[...,None]*14
hairzone=(z>zeye-0.005)|((y>-0.03)&(z>zeye-0.11))   # crown and sides down to the ears, back of head down to the nape
fill=np.where(hairzone[...,None],hair+noise*.9,skin+noise*.35)
tex=photo*alpha+fill*(1-alpha)
# the UV layout has gaps between islands: dilate so seams/mipmaps do not show a background colour
img=np.clip(tex,0,255).astype(np.uint8); mask=(~on).astype(np.uint8)*255
img=cv2.inpaint(img,mask,6,cv2.INPAINT_TELEA)
img[~on]=cv2.GaussianBlur(img,(0,0),3)[~on]
cv2.imwrite('out/khalil-skin-v2.png',img); print('saved texture')
