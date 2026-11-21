"""CARTO の LAT を、エクスポートの心電図から計算し直して比べる（想定ルールの検証）。
想定（取説：ユニポーラの最大の負の傾き -dV/dt をマッピングのアノテーションとする）:
  1) WOI（参照アノテーション ＋ From 〜 ＋ To）の中で、ユニポーラ M1 の傾きが最も負になる時刻を探す
  2) LAT ＝ そのサンプル − 参照アノテーション（サンプル＝ms、1 kHz と想定）
使い方: python3 -I check_carto_lat.py <Export フォルダ>
"""
import re, glob, os, sys

def load(path):
    L = open(path, encoding='latin-1').read().replace('\r', '').split('\n')
    gain = float(re.search(r'gain\) = ([0-9.]+)', L[1]).group(1))
    names = [n.strip() for n in re.split(r'\s{2,}', L[3].strip()) if n.strip()]
    rows = []
    for l in L[4:]:
        try:
            rows.append([float(x) for x in l.split()])
        except ValueError:
            pass
    return gain, names, rows

def col(names, pref):
    for i, n in enumerate(names):
        if n.startswith(pref):
            return i
    return None

def lat_candidate(sig, ref, frm, to):
    """WOI 内で最も負の傾き（一次差分）の位置を、リファレンスからの差（ms）で返す。"""
    a, b = max(1, ref + frm), min(len(sig) - 1, ref + to)
    best, idx = 0.0, None
    for i in range(a, b):
        d = sig[i + 1] - sig[i - 1]
        if d < best:
            best, idx = d, i
    return None if idx is None else idx - ref

def check_dir(D, verbose=True):
    rows_out = []
    for ep in sorted(glob.glob(os.path.join(D, '**', '*_ECG_Export.txt'), recursive=True)):
        base = ep[:-len('_ECG_Export.txt')]
        xp = base + '_Point_Export.xml'
        if not os.path.exists(xp):
            continue
        x = open(xp, encoding='latin-1').read()
        ref = int(re.search(r'Reference_Annotation="(-?\d+)"', x).group(1))
        frm, to = map(int, re.search(r'WOI From="(-?\d+)" To="(-?\d+)"', x).groups())
        m = re.search(r'Map_Annotation="(-?\d+)"', x)
        exp_map = int(m.group(1)) if m else -10000
        gain, names, rows = load(ep)
        ui = col(names, 'M1(')
        if ui is None:
            continue
        U = [r[ui] * gain for r in rows if len(r) > ui]
        cand = lat_candidate(U, ref, frm, to)
        exp_lat = None if exp_map <= -9000 else exp_map - ref
        rows_out.append((os.path.basename(base), exp_lat, cand))
    if verbose:
        comp = [r for r in rows_out if r[1] is not None]
        print('points:', len(rows_out), ' with valid exported LAT:', len(comp))
        for r in rows_out:
            print('  %-14s exported LAT=%s  candidate LAT=%s' % (r[0], r[1], r[2]))
        if comp:
            ok = sum(1 for r in comp if r[2] is not None and abs(r[2] - r[1]) <= 3)
            print('match within ±3 ms: %d / %d' % (ok, len(comp)))
    return rows_out

if __name__ == '__main__':
    check_dir(sys.argv[1])
