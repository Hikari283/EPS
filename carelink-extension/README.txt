PaceGuard CareLink 取り込み（Chrome拡張機能）※CareLink用のChromeにだけ入れる

CareLink（Medtronic）で開いたPDFを、自動で「ダウンロード先\CareLink\」に保存します。
CareLink用のChromeのダウンロード先を「波形認識\CareLink用」にしておくと、「波形認識\CareLink用\CareLink」に入ります。
PDFはこのパソコンに保存するだけで、外部には送りません。

入れ方（CareLink用のChromeで）
1. このフォルダ（carelink-extension）を「波形認識\CareLink用」の中に置く（消さない場所）
2. CareLink用のChromeで chrome://extensions を開く
3. 右上の「デベロッパー モード」をオン
4. 「パッケージ化されていない拡張機能を読み込む」→ このフォルダを選ぶ
5. 「詳細」→「ファイルの URL へのアクセスを許可する」をオン
6. 右上のパズルのアイコン → 「PaceGuard CareLink 取り込み」をピン留め

設定（アイコンをクリック）
- 自動で保存する：オン／オフ
- 保存先：ダウンロード先の中のフォルダ名（既定 CareLink）
- 対象サイト：CareLinkのアドレス（既定 medtronic.com / medtroniccarelink.net）

v0.1.0（2026-11-18）
- LATITUDE用（paceguard-extension v0.6.0）をもとに作成。CareLinkのサイトで開いたPDF（サーバーから届くもの・ページの中で作られるもの）を保存。
