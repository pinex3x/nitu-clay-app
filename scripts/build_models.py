import numpy as np, json
from skimage.measure import marching_cubes
from scipy.ndimage import gaussian_filter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/assets/models'; OUT.mkdir(parents=True,exist_ok=True)
# Coordinates are x, height y, forward z. Models share scale and camera convention.
xs=np.arange(-1.55,1.551,.016,dtype=np.float32);ys=np.arange(-.08,3.451,.016,dtype=np.float32);zs=np.arange(-1.6,1.951,.016,dtype=np.float32)
X,Y,Z=np.meshgrid(xs,ys,zs,indexing='ij'); shape=X.shape

def ell(c,r,p=2):
 a=np.abs((X-c[0])/r[0]);b=np.abs((Y-c[1])/r[1]);d=np.abs((Z-c[2])/r[2]);return ((a**p+b**p+d**p)**(1/p)-1)*min(r)
def smooth(a,b,k=.10):
 h=np.clip(.5+.5*(b-a)/k,0,1);return b*(1-h)+a*h-k*h*(1-h)
def make(kind):
 parts=[]
 def e(c,r,p=2):parts.append(ell(c,r,p))
 if kind==0:
  e((0,.98,-.24),(.78,.88,1.0),2.3);e((0,1.72,.69),(.94,.85,.66),2.45)
  for s in [-1,1]:
   e((s*.72,2.34,.62),(.29,.34,.25));e((s*.58,.57,.72),(.31,.59,.34));e((s*.58,.24,.89),(.38,.25,.46),2.3)
   e((s*.61,.53,-.72),(.36,.46,.4));e((s*.65,.21,-.78),(.39,.22,.43),2.3)
   e((s*.26,1.38,1.37),(.33,.27,.23));e((s*.44,1.91,1.36),(.29,.33,.12))
  e((0,1.15,1.14),(.55,.23,.23));e((0,1.54,1.59),(.17,.12,.09))
  for t in np.linspace(0,1,16):
   e((.25+.25*np.sin(t*3.5),.63+t*.91,-1.05-.16*np.sin(t*3)),(.16,.18,.16))
 elif kind==1:
  e((0,.77,-.25),(.64,.72,.87),2.2);e((0,1.43,.47),(.63,.58,.55),2.2)
  for s in [-1,1]:
   e((s*.31,2.22,.24),(.22,.77,.22));e((s*.42,.18,.55),(.28,.2,.43),2.2);e((s*.46,.23,-.65),(.35,.27,.38));e((s*.16,1.18,.94),(.22,.17,.13))
  e((0,1.28,1.03),(.10,.07,.07));e((0,.64,-1.03),(.28,.26,.26))
 else:
  e((0,.89,0),(.5,.78,.55),2.2);e((0,1.68,.30),(.46,.44,.43));e((0,1.56,.77),(.13,.13,.28))
  for s in [-1,1]:
   e((s*.64,1.10,-.07),(.60,.34,.19),2.0)
   for t in np.linspace(0,1,10):e((s*(.3+t*.9),1.03+t*.75,-.08-t*.3),(.23-.11*t,.20,.12))
   e((s*.22,.13,.15),(.21,.14,.32));e((s*.23,.35,-.55),(.16,.17,.53))
 field=parts.pop(0)
 for p in parts:field=smooth(field,p,.09)
 del parts
 verts,faces,norms,_=marching_cubes(field,level=0,spacing=(.016,.016,.016),gradient_direction='ascent')
 norms=-norms
 verts+=np.array([xs[0],ys[0],zs[0]])
 # Handmade asymmetry at multiple scales, without low-poly facets.
 v=verts; wave=.004*np.sin(v[:,0]*23+v[:,2]*11)*np.cos(v[:,1]*19)+.003*np.sin(v[:,0]*41-v[:,1]*35+v[:,2]*17)
 v+=norms*wave[:,None]
 v=sculpt(v,norms,kind)
 # Recompute area-weighted smooth normals after carved relief.
 fn=np.cross(v[faces[:,1]]-v[faces[:,0]],v[faces[:,2]]-v[faces[:,0]])
 if np.mean(np.sum(fn*norms[faces[:,0]],axis=1))<0: fn=-fn
 normsum=np.zeros_like(v)
 for j in range(3):np.add.at(normsum,faces[:,j],fn)
 norms=normsum/np.maximum(np.linalg.norm(normsum,axis=1)[:,None],1e-8)
 cols=paint(v,kind)
 # normals from marching cubes are outward; fix mesh winding for glTF/culling.
 cross=np.cross(v[faces[:,1]]-v[faces[:,0]],v[faces[:,2]]-v[faces[:,0]])
 if np.mean(np.sum(cross*norms[faces[:,0]],axis=1))<0:faces=faces[:,::-1]
 arrays={'position':v.astype('<f4'),'normal':norms.astype('<f4'),'color':cols.astype('<f4'),'index':faces.astype('<u4').reshape(-1)}
 meta={'vertices':len(v),'triangles':len(faces),'parts':{},'kind':kind};offset=0;chunks=[]
 for k,a in arrays.items():
  b=a.tobytes();meta['parts'][k]={'offset':offset,'length':a.size};chunks.append(b);offset+=len(b)
 (OUT/f'{kind}.bin').write_bytes(b''.join(chunks));(OUT/f'{kind}.json').write_text(json.dumps(meta));np.savez_compressed(OUT/f'{kind}.npz',vertices=v,faces=faces,normals=norms,colors=cols)
 print(kind,len(v),len(faces),offset,flush=True)

def paint(v,kind):
 x,y,z=v.T; ax=np.abs(x); n=len(x)
 def rgb(h):return np.array([int(h[i:i+2],16)/255 for i in (1,3,5)])
 c=np.tile(rgb('#cba975' if kind==0 else '#d8bd8d' if kind==1 else '#434d43'),(n,1))
 def put(mask,col,a=1):
  nonlocal c
  f=np.clip(mask,0,1)*a;c=c*(1-f[:,None])+rgb(col)*f[:,None]
 def el(cx,cy,rx,ry,u=x,w=y):return ((u-cx)/rx)**2+((w-cy)/ry)**2
 def inside(q,edge=.08):return np.clip((1-q)/edge+.5,0,1)
 def line(points,width,u=x,w=y):
  d=np.full(n,100.)
  for (a,b),(cc,dd) in zip(points[:-1],points[1:]):
   vx=cc-a;vy=dd-b;t=np.clip(((u-a)*vx+(w-b)*vy)/(vx*vx+vy*vy+1e-9),0,1);d=np.minimum(d,np.sqrt((u-a-vx*t)**2+(w-b-vy*t)**2))
  return np.clip((width-d)/.008+.5,0,1)
 def flower(u,w,cu,cw,r,mask):
  dx=u-cu;dy=w-cw;ang=np.arctan2(dy,dx);rad=np.sqrt(dx*dx+dy*dy);bound=r*(.70+.30*np.cos(5*ang));petals=np.clip((bound-rad)/.012+.5,0,1)*mask
  put(petals,'#a84c32');put(inside((rad/(r*.23))**2)*mask,'#d7b352');put(inside((rad/(r*.10))**2)*mask,'#393d32')
 if kind==0:
  front=(z>1.04).astype(float);face=(z>.92).astype(float)
  put(inside(el(0,1.34,.72,.39))*front,'#e3c494')
  for s in [-1,1]:
   eye=inside(el(s*.44,1.93,.31,.34))*front;put(eye,'#efe0b6')
   put(inside(el(s*.44,1.93,.25,.28))*front,'#344b3a');put(inside(el(s*.44,1.93,.192,.223))*front,'#d5b478')
   put(inside(el(s*.44,1.93,.100,.145))*front,'#282e26');put(inside(el(s*.475,2.003,.016,.032))*front,'#f5dfad',.8)
   # Pigment marks follow forehead contours, red over cream, green inner leaf.
   for points in [[(.12,2.44),(.18,2.32),(.28,2.21),(.38,2.18)],[(.39,2.37),(.54,2.31),(.65,2.23)],[(.73,1.98),(.84,1.9),(.86,1.79)],[(.75,1.72),(.81,1.62),(.72,1.54)]]:
    pts=[(a*s,b) for a,b in points];mask=line(pts,.055)*face;put(mask,'#ab4b31');put(line(pts,.021)*face,'#344b38')
   put(line([(s*.06,2.2),(s*.14,2.08),(s*.18,1.96)],.035)*front,'#a54830')
   put(line([(s*.20,1.34),(s*.35,1.29),(s*.5,1.32)],.018)*front,'#3b392d')
   for a,b in [(.25,1.46),(.39,1.44),(.3,1.35)]:put(inside(el(s*a,b,.024,.022))*front,'#36392e')
   # Ear bowls and claws.
   ear=(y>2.18)&(z>.68);put(inside(el(s*.72,2.4,.19,.24))*ear,'#a84931');put(inside(el(s*.72,2.41,.12,.17))*ear,'#3c4134')
   for d in [-.12,0,.12]:put(line([(s*.58+d,.13),(s*.58+d,.23)],.018)*((z>1.18)&(y<.38)),'#3c3e2f')
  put(inside(el(0,1.55,.19,.13))*(z>1.45),'#a94731');put(line([(0,1.49),(0,1.31),(-.12,1.25)],.022)*front,'#373c2f');put(line([(0,1.31),(.12,1.25)],.022)*front,'#373c2f')
  put(inside(el(0,2.35,.07,.12))*face,'#3c6146')
  put(line([(-.14,2.36),(.14,2.36)],.022)*face,'#343b2e');put(line([(-.10,2.25),(.10,2.25)],.023)*face,'#343b2e');put(line([(-.15,2.13),(.15,2.13)],.023)*face,'#343b2e');put(line([(0,2.39),(0,2.13)],.025)*face,'#343b2e')
  # Body floral folk painting: flowers, vines, almond leaves on both flanks.
  side=((ax>.40)&((z<.58)|(y<1.12))).astype(float)
  for u0,w0,r in [(-.5,1.05,.27),(.1,.67,.23),(-.85,.53,.19)]:flower(z,y,u0,w0,r,side)
  put(line([(-.95,.4),(-.73,.7),(-.5,.82),(-.18,1.20),(.12,1.36)],.018,u=z)*side,'#47634a')
  for cu,cw in [(-.73,.8),(-.19,1.1),(-.35,1.42),(.18,.92),(-.95,.98)]:
   u=(z-cu)*.8+(y-cw)*.6;w=-(z-cu)*.6+(y-cw)*.8;put(inside((u/.15)**2+(w/.055)**2)*side,'#3d634a')
  chest=((z>.85)&(y<1.10)).astype(float);flower(x,y,0,.8,.20,chest)
  for s in [-1,1]:
   flower(x,y,s*.56,.65,.17,chest)
   put(inside(el(s*.55,.43,.06,.11))*chest,'#446447')
   put(line([(s*.8,.35),(s*.72,.28),(s*.66,.29)],.035)*chest,'#a74c34')
 elif kind==1:
  front=(z>.65).astype(float)
  for s in [-1,1]:
   put(inside(el(s*.31,2.27,.12,.55))*((z>.31)&(y>1.7)),'#b16d4c')
   put(inside(el(s*.30,1.52,.085,.10))*front,'#333c2d');put(inside(el(s*.32,1.55,.02,.02))*front,'#edddb7')
   put(inside(el(s*.43,1.28,.12,.06))*front,'#b55c3d')
  put(inside(el(0,1.28,.1,.075))*(z>1),'#ad5138')
  side=((ax>.3)&(z<.4)).astype(float)
  for u0,w0,r in [(-.32,.88,.25),(-.71,.55,.17),(.10,.55,.18)]:flower(z,y,u0,w0,r,side)
  put(line([(-.8,.4),(-.58,.65),(-.40,1.0),(-.20,1.27)],.022,u=z)*side,'#3b6348')
  for u0,w0 in [(-.6,.85),(-.15,1.04),(-.75,.36),(.12,.85)]:put(inside(el(u0,w0,.13,.06,u=z))*side,'#44674c')
 else:
  front=(z>.36).astype(float);put(inside(el(0,.87,.38,.58))*front,'#d9ba84');flower(x,y,0,.84,.21,front)
  put(inside(el(0,1.45,.28,.18))*front,'#af4a33')
  for s in [-1,1]:
   put(inside(el(s*.24,1.76,.14,.16))*front,'#d6b784');put(inside(el(s*.24,1.76,.065,.085))*front,'#242d27')
   wing=(ax>.45).astype(float)
   for delta in [0,.13,.26]:put(line([(s*.42,1.05+delta),(s*.70,1.22+delta),(s*1.03,1.55+delta)],.025)*wing,'#b45635')
  put((z>.89).astype(float),'#ae4d33')
 # Fine mottling reflects handmade pigment; geometry microtexture added in renderer.
 grain=.025*np.sin(x*139+y*83+z*117)*np.sin(y*173-z*67)+.016*np.sin(x*31-y*27+z*19)
 return np.clip(c+grain[:,None],0,1)

def sculpt(v,norms,kind):
 x,y,z=v.T;n=len(x);height=np.zeros(n)
 def ridge(points,width=.023,depth=.024,u=x,w=y):
  d=np.full(n,100.)
  for (a,b),(c,dv) in zip(points[:-1],points[1:]):
   vx=c-a;vy=dv-b;t=np.clip(((u-a)*vx+(w-b)*vy)/(vx*vx+vy*vy+1e-9),0,1);d=np.minimum(d,np.sqrt((u-a-vx*t)**2+(w-b-vy*t)**2))
  return depth*np.exp(-(d/width)**2)
 if kind==0:
  front=np.clip((z-1.06)/.12,0,1)
  for s in [-1,1]:
   q=np.sqrt(((x-s*.44)/.31)**2+((y-1.93)/.35)**2);height+=.030*np.exp(-((q-1)/.08)**2)*front
   q=np.sqrt(((x-s*.44)/.12)**2+((y-1.93)/.17)**2);height+=.022*np.exp(-((q-1)/.12)**2)*front
   pts=[(s*(.53+.15*t*np.cos(t*7)),1.57+.12*t*np.sin(t*7)) for t in np.linspace(0,1,25)]
   height+=ridge(pts,.018,.022)*front
   height+=ridge([(s*.10,2.4),(s*.19,2.3),(s*.29,2.24),(s*.4,2.25)],.027,.025)*front
   height-=ridge([(0,1.49),(0,1.30),(s*.14,1.25)],.016,.022)*front
   for d in [-.11,0,.11]:height-=ridge([(s*.58+d,.14),(s*.58+d,.25)],.018,.022)*((z>1.12)&(y<.38))
  side=np.clip((np.abs(x)-.46)/.13,0,1)*np.clip((.7-z)/.20,0,1)
  for cu,cw,r in [(-.50,1.05,.27),(.1,.67,.23),(-.85,.53,.19)]:
   dx=z-cu;dy=y-cw;a=np.arctan2(dy,dx);rr=np.sqrt(dx*dx+dy*dy);bound=r*(.70+.30*np.cos(5*a))
   height+=.019*np.exp(-((rr-bound)/.022)**2)*side
 elif kind==1:
  for s in [-1,1]:
   q=np.sqrt(((x-s*.30)/.09)**2+((y-1.52)/.105)**2);height+=.023*np.exp(-((q-1)/.13)**2)*(z>.65)
 return v+norms*height[:,None]

for k in range(3):make(k)
