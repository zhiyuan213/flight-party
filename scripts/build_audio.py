"""Original procedural game sound assets. No third-party recordings."""
import math, random, wave, struct
from pathlib import Path
random.seed(42)
SR=44100
OUT=Path(__file__).resolve().parents[1]/'dist/assets/audio';OUT.mkdir(parents=True,exist_ok=True)
def save(name,data):
 peak=max(.001,max(abs(x) for x in data));gain=min(1,.82/peak)
 with wave.open(str(OUT/name),'wb') as f:
  f.setparams((1,2,SR,0,'NONE','not compressed'));f.writeframes(b''.join(struct.pack('<h',int(max(-1,min(1,x*gain))*32767)) for x in data))
def sound(duration,parts):
 out=[0.0]*int(SR*duration)
 for start,length,base,end,amp,style in parts:
  phase=0
  for j in range(int(length*SR)):
   idx=int(start*SR)+j
   if idx>=len(out):break
   t=j/SR;u=t/length;env=min(1,t/.008)*(1-u)**1.8
   if style=='spring':freq=end+(base-end)*math.exp(-u*3)*(1+.16*math.sin(t*70))
   else:freq=base*(end/base)**u
   phase+=2*math.pi*freq/SR
   v=math.sin(phase)
   if style=='rubber':v=.8*v+.16*math.sin(phase*2)+.08*math.sin(phase*3)
   if style=='noise':v=(random.random()*2-1)*.4+v*.2
   out[idx]+=v*amp*env
 return out
for i in range(5):
 save(f'bump-{i+1}.wav',sound(.95,[(0,.12,110+i*8,50,.48,'rubber'),(.025,.57,350+i*80,85+i*10,.48,'spring'),(.22,.35,650+i*60,180,.13,'rubber')]))
save('roll.wav',sound(.6,[(i*.07,.06,240+i*60,70,.17,'noise') for i in range(7)]))
save('takeoff.wav',sound(.36,[(0,.34,180,700,.12,'rubber')]))
save('land.wav',sound(.18,[(0,.15,155,55,.2,'rubber'),(.02,.09,440,300,.06,'noise')]))
save('click.wav',sound(.09,[(0,.08,900,600,.16,'rubber')]))
save('win.wav',sound(1.7,[(i*.15,.45,f,f,.2,'rubber') for i,f in enumerate([523.25,659.25,783.99,1046.5,1318.5])]))
print('Created 10 original WAV effects')
