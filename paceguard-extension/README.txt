PaceGuard LATITUDE 取り込み（Chrome拡張機能）

LATITUDEで開いたPDFを、自動で「ダウンロード先\LATITUDE\」に保存します。
PaceGuard LATITUDE（paceguard-latitude.html）の「👀 見張り」がそのフォルダを見て、
波形のPDFを比較し、全部のPDFを患者ごとのフォルダへ整理します。
PDFはこのパソコンに保存するだけで、外部には送りません。

入れ方
1. このフォルダ（paceguard-extension）を、消さない場所に置く
2. Chromeで chrome://extensions を開く
3. 右上の「デベロッパー モード」をオン
4. 「パッケージ化されていない拡張機能を読み込む」→ このフォルダを選ぶ
5. 右上のパズルのアイコン → 「PaceGuard LATITUDE 取り込み」をピン留め

設定（アイコンをクリック）
- 自動で保存する：オン／オフ
- 保存先：ダウンロード先の中のフォルダ名（既定 LATITUDE）
- 対象サイト：LATITUDEのアドレス（既定 bostonscientific.com / bostonscientific.jp）

通知（v0.2.0〜）
- ツールの評価結果を、拡張機能がWindowsの通知で知らせます。
- chrome://extensions →「PaceGuard LATITUDE 取り込み」の「詳細」→「ファイルの URL へのアクセスを許可する」をオンにしてください。

左右に並べる（v0.4.0〜）
- ツールのタブが開くと、左：ツール／右：LATITUDE に自動で並べます（Chromeを起動して最初の1回）。
- 拡張機能のアイコン →「🪟 今すぐ左右に並べる」でいつでも並べ直せます。オフにもできます。
- 「ファイルの URL へのアクセスを許可する」がオンになっている必要があります。
