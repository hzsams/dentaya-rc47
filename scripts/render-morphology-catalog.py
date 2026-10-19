"""Render exact crown geometry into comparison thumbnails and a public form catalog.

Requires numpy, matplotlib and Pillow. Uses a common camera and identical dimensions
for every family, so a difference cannot come from thumbnail auto-scaling.
"""
from pathlib import Path
import json
import os
import tempfile
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
source=Path(os.environ.get('DENTAYA_FORM_RENDER_INPUT',str(Path(tempfile.gettempdir())/'dentaya-morphology-catalog.json')))
data=json.loads(source.read_text())
directory=root/'public/tooth-forms';directory.mkdir(exist_ok=True)
release='RC'+json.loads((root/'package.json').read_text())['version'].split('rc.')[1]
light=np.array([-.35,-.5,.8]);light/=np.linalg.norm(light)

def render(model):
 if os.environ.get('DENTAYA_FORM_EXISTING_PREVIEWS')=='1':
  return Image.open(directory/(model['id']+'.png')).convert('RGB')
 fig=plt.figure(figsize=(6,3),dpi=120,facecolor='#e5ebe6')
 for number,mesh in enumerate(model['meshes'],1):
  ax=fig.add_subplot(1,2,number,projection='3d',computed_zorder=False)
  p=np.asarray(mesh['positions']).reshape(-1,3);faces=p[np.asarray(mesh['indices']).reshape(-1,3)]
  normals=np.cross(faces[:,1]-faces[:,0],faces[:,2]-faces[:,0]);normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-10)
  intensity=.48+.46*np.maximum(normals@light,0)+.07*np.maximum(normals@np.array([.3,.2,.93]),0)**12
  colors=np.clip(intensity[:,None]*np.array([1,.98,.93])[None,:],0,1)
  ax.add_collection3d(Poly3DCollection(faces,facecolors=colors,edgecolors='none',antialiased=False,zsort='average'))
  ax.set_xlim(-6.7,6.7);ax.set_ylim(-6.7,6.7);ax.set_zlim(-6.7,6.7);ax.set_box_aspect((1,1,1));ax.set_axis_off();ax.set_facecolor('#e5ebe6')
  ax.view_init(elev=18 if number==1 else 67,azim=-74 if number==1 else -68)
  ax.set_proj_type('ortho')
 fig.subplots_adjust(left=0,right=1,bottom=0,top=1,wspace=-.12)
 file=directory/(model['id']+'.png');fig.savefig(file,facecolor=fig.get_facecolor(),dpi=120);plt.close(fig)
 im=Image.open(file).convert('RGB');im.resize((360,180),Image.Resampling.LANCZOS).save(file)
 return Image.open(file).convert('RGB')

font_root=Path('/usr/share/fonts/truetype/dejavu')
font=lambda size,bold=False:ImageFont.truetype(str(font_root/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),size)
board=Image.new('RGB',(1600,2160),'#f7f7f2');draw=ImageDraw.Draw(board)
draw.text((60,45),'DENTAYA  /  MORFOLOJİ KÜTÜPHANESİ',font=font(22,True),fill='#17343a')
draw.text((60,105),'24 farklı anatomik karakter',font=font(38,True),fill='#17343a')
draw.text((60,167),'Aynı ölçüler ve aynı kamera. Farklar; kenar, lob, tüberkül, sırt ve oluk yapısında.',font=font(17),fill='#61716b')
draw.line((60,215,1540,215),fill='#ccd8d1',width=2)
for row,group in enumerate(data['groups']):
 y=244+row*305;draw.text((60,y),group['label'].upper(),font=font(15,True),fill='#166858')
 models=[m for m in data['models'] if m['group']==group['id']]
 for col,model in enumerate(models):
  x=60+col*377;card_y=y+34
  draw.rounded_rectangle((x,card_y,x+350,card_y+240),radius=8,fill='white',outline='#d5ddd7',width=1)
  im=render(model);board.paste(im.resize((330,165)),(x+10,card_y+10))
  draw.text((x+18,card_y+190),model['name'],font=font(19,True),fill='#17343a')
  draw.text((x+18,card_y+217),'Kesici kenar  ·  Oklüzal yüzey',font=font(11),fill='#68786f')
draw.line((60,2107,1540,2107),fill='#ccd8d1',width=2)
draw.text((60,2122),release+'  /  6 morfoloji sınıfı  /  Boyut varyantları form ailesi olarak sayılmaz.',font=font(15),fill='#61716b')
board.save(directory/('DentAYA_'+release+'_Form_Katalogu.png'))
print('Rendered 24 exact-geometry thumbnails and a common-scale comparison catalog.')
