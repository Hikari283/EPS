import re,glob,os,sys
D=sys.argv[1]
def load(path):
    L=open(path,encoding='latin-1').read().replace('\r','').split('\n')
    gain=float(re.search(r'gain\) = ([0-9.]+)',L[1]).group(1))
    names=[n.strip() for n in re.split(r'\s{2,}',L[3].strip()) if n.strip()]
    rows=[]
    for l in L[4:]:
        try: rows.append([float(x) for x in l.split()])
        except: pass
    return gain,names,rows
def idx(names,pref):
    for i,n in enumerate(names):
        if n.startswith(pref): return i
    return None
tot=okB=okU=0; tab=[]
for ep in sorted(glob.glob(os.path.join(D,'**','*_ECG_Export.txt'),recursive=True)):
    base=ep[:-len('_ECG_Export.txt')]; xp=base+'_Point_Export.xml'
    if not os.path.exists(xp): continue
    x=open(xp,encoding='latin-1').read()
    ref=int(re.search(r'Reference_Annotation="(-?\d+)"',x).group(1))
    frm,to=map(int,re.search(r'WOI From="(-?\d+)" To="(-?\d+)"',x).groups())
    bx=float(re.search(r'Bipolar="([-0-9.]+)"',x).group(1)); ux=float(re.search(r'Unipolar="([-0-9.]+)"',x).group(1))
    gain,names,rows=load(ep)
    bi=idx(names,'M1-M2'); ui=idx(names,'M1(')
    if bi is None or ui is None: continue
    B=[r[bi]*gain for r in rows if len(r)>bi]; U=[r[ui]*gain for r in rows if len(r)>ui]
    a,b=ref+frm,ref+to
    sb=B[a:b]; su=U[a:b]
    pb=max(sb)-min(sb); pu=max(su)-min(su)
    tot+=1; okB+= abs(pb-bx)<=0.002; okU+= abs(pu-ux)<=0.05*max(ux,0.1)
    tab.append((os.path.basename(base),bx,round(pb,3),ux,round(pu,3)))
print('points',tot,'bipolar match(±0.002 mV)',okB,'unipolar match(±5%)',okU)
for t in tab[:12]: print(t)
