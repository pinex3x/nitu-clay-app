import moderngl, numpy as np, math, json, sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'public/assets/renders';OUT.mkdir(exist_ok=True)
ctx=moderngl.create_standalone_context(backend='egl');ctx.enable(moderngl.DEPTH_TEST)
V='''#version 330
in vec3 in_position;in vec3 in_normal;in vec3 in_color;
uniform mat4 mvp;uniform mat4 model;uniform mat4 lightMVP;uniform float phase;uniform int floorMode;
out vec3 world;out vec3 norm;out vec3 pigment;out vec4 shadowCoord;
void main(){vec3 p=in_position;vec3 n=in_normal;if(floorMode==0){float morph=1.-smoothstep(0.,1.8,phase);vec3 v=p-vec3(0.,1.2,0.);vec3 unit=normalize(v);vec3 lump=unit*vec3(.78,.56,.67)+vec3(0.,.56,0.);p=mix(p,lump,morph);n=normalize(mix(n,unit,morph));}world=(model*vec4(p,1.)).xyz;norm=mat3(model)*n;pigment=in_color;shadowCoord=lightMVP*vec4(world,1.);gl_Position=mvp*vec4(world,1.);}
'''
F='''#version 330
in vec3 world;in vec3 norm;in vec3 pigment;in vec4 shadowCoord;uniform sampler2D shadowMap;uniform float phase;uniform int floorMode;out vec4 outColor;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 sc=shadowCoord.xyz/shadowCoord.w*.5+.5;float sh=0.;for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++){float d=texture(shadowMap,sc.xy+vec2(x,y)/180.).r;sh+=(sc.z-.0025>d)?0.45:1.;}sh/=25.;vec3 bg=vec3(.957,.941,.906);if(floorMode==1){float contact=exp(-length(world.xz)*2.5)*.055;outColor=vec4(bg*(.94+.06*sh-contact),1);return;}
float rough=noise(world*150.);float grain=noise(world*47.);vec3 n=normalize(norm+vec3(noise(world*128.+vec3(5,0,0))-.5,noise(world*128.+vec3(0,5,0))-.5,noise(world*128.+vec3(0,0,5))-.5)*.12);
vec3 raw=mix(vec3(.62,.41,.25),vec3(.72,.53,.35),smoothstep(2.,3.,phase));raw=mix(raw,vec3(.87,.80,.64),smoothstep(3.,4.,phase));float reveal=smoothstep(world.y/3.2-.15,world.y/3.2+.15,(phase-4.)*1.3);vec3 col=mix(raw,pigment,reveal);col*=.96+rough*.07+(grain-.5)*.04;
float key=max(0.,dot(n,normalize(vec3(-3.,6.,5.))));float fill=max(0.,dot(n,normalize(vec3(4.,2.,3.))));float rim=max(0.,dot(n,normalize(vec3(2.,4.,-4.))));float lit=.47+.49*key*sh+.17*fill+.12*rim;lit*=.90+.10*smoothstep(0.,.45,world.y);col*=lit;outColor=vec4(col,1.);}
'''
SF='''#version 330
void main(){}
'''
p=ctx.program(vertex_shader=V,fragment_shader=F);sp=ctx.program(vertex_shader=V,fragment_shader=SF)
def normalize(v):return v/np.linalg.norm(v)
def look(eye,at):
 eye=np.array(eye,dtype=float);f=normalize(np.array(at)-eye);s=normalize(np.cross(f,[0,1,0]));u=np.cross(s,f);m=np.eye(4);m[0,:3]=s;m[1,:3]=u;m[2,:3]=-f;m[:3,3]=-m[:3,:3]@eye;return m
def ortho(l,r,b,t,n,f):
 return np.array([[2/(r-l),0,0,-(r+l)/(r-l)],[0,2/(t-b),0,-(t+b)/(t-b)],[0,0,-2/(f-n),-(f+n)/(f-n)],[0,0,0,1]],dtype=float)
def matrix(prog,name,m):
 if name in prog:prog[name].write(m.astype('f4').T.tobytes())
def val(prog,name,v):
 if name in prog:prog[name].value=v
view=look([0,2.65,7.5],[0,1.28,0]);vp=ortho(-1.8,1.8,-2.025,2.025,.1,30)@view
light=ortho(-3.5,3.5,-3.5,3.5,.1,30)@look([-4,7,5],[0,1,0])
depth=ctx.depth_texture((1536,1536));depth.compare_func='';depth.filter=(moderngl.LINEAR,moderngl.LINEAR);shadow=ctx.framebuffer(depth_attachment=depth)
W,H=(640,720) if '--preview' in sys.argv else (480,540)
fbo=ctx.simple_framebuffer((W,H),components=4,samples=4);resolved=ctx.simple_framebuffer((W,H),components=4)
flpos=np.array([[-30,-.015,-30],[30,-.015,-30],[30,-.015,30],[-30,-.015,-30],[30,-.015,30],[-30,-.015,30]],'f4');flnorm=np.tile([0,1,0],(6,1));flcol=np.ones((6,3));fbuf=ctx.buffer(np.column_stack([flpos,flnorm,flcol]).astype('f4').tobytes());fvao=ctx.vertex_array(p,[(fbuf,'3f 3f 3f','in_position','in_normal','in_color')]);p['shadowMap']=0
kinds=[0] if '--preview' in sys.argv else range(3)
for k in kinds:
 d=np.load(ROOT/f'public/assets/models/{k}.npz');buf=ctx.buffer(np.column_stack([d['vertices'],d['normals'],d['colors']]).astype('f4').tobytes());ib=ctx.buffer(d['faces'].astype('u4').tobytes());vao=ctx.vertex_array(p,[(buf,'3f 3f 3f','in_position','in_normal','in_color')],ib);svao=ctx.vertex_array(sp,[(buf,'3f 24x','in_position')],ib)
 for phase in ([5] if '--preview' in sys.argv else np.linspace(0,5,121) if '--animation' in sys.argv else range(6)):
  for a in ([0] if ('--preview' in sys.argv or '--animation' in sys.argv) else range(24)):
   angle=-.43+a*math.pi*2/24;c=math.cos(angle);s=math.sin(angle);model=np.array([[c,0,s,0],[0,1,0,0],[-s,0,c,0],[0,0,0,1]])
   shadow.use();ctx.viewport=(0,0,1536,1536);ctx.clear(depth=1);matrix(sp,'model',model);matrix(sp,'mvp',light);val(sp,'phase',phase);val(sp,'floorMode',0);svao.render()
   fbo.use();ctx.viewport=(0,0,W,H);ctx.clear(.957,.941,.906,1,depth=1);depth.use(0);matrix(p,'mvp',vp);matrix(p,'lightMVP',light);matrix(p,'model',np.eye(4));val(p,'phase',phase);val(p,'floorMode',1);fvao.render();matrix(p,'model',model);val(p,'floorMode',0);vao.render();ctx.copy_framebuffer(resolved,fbo)
   im=Image.frombytes('RGBA',(W,H),resolved.read(components=4)).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB');im.save(OUT/(f'{k}-motion-{int(round(phase*24))}.webp' if '--animation' in sys.argv else f'{k}-{phase}-{a}.webp'),quality=86)
  print('RENDERED',k,phase,flush=True)
 vao.release();svao.release();buf.release();ib.release()
