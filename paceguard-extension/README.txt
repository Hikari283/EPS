PaceGuard LATITUDE 取り込み（Chrome拡張機能）

LATITUDEで開いたPDFを、自動で「ダウンロード先\LATITUDE用\LATITUDE\」に保存します（v0.7.0〜。Chromeのダウンロード先は「波形認識」）。
PaceGuard LATITUDE（paceguard-latitude.html）の「👀 自動比較」がそのフォルダを見て、
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
- LATITUDEの保存先：ダウンロード先の中のフォルダ（既定 LATITUDE用/LATITUDE）
- CareLinkの保存先：ダウンロード先の中のフォルダ（既定 CareLink用/CareLink）
- 対象サイト：LATITUDEのアドレス（既定 bostonscientific.com / bostonscientific.jp）

通知（v0.2.0〜）
- ツールの評価結果を、拡張機能がWindowsの通知で知らせます。
- chrome://extensions →「PaceGuard LATITUDE 取り込み」の「詳細」→「ファイルの URL へのアクセスを許可する」をオンにしてください。

左右に並べる（v0.4.0〜）
- ツールのタブが開くと、左：ツール／右：LATITUDE に自動で並べます（Chromeを起動して最初の1回）。
- 拡張機能のアイコン →「🪟 今すぐ左右に並べる」でいつでも並べ直せます。オフにもできます。
- 「ファイルの URL へのアクセスを許可する」がオンになっている必要があります。

v0.6.0（2026-10-17）
- 試験中だった「自動レポート作成」はやめました。動きは v0.4.3（手動版）と同じです。
- 入れ替えると、前の版が残した自動レポートの設定・記録は自動で消えます。

v0.7.0（2026-11-18）
- Chromeのダウンロード先を「波形認識」にする前提に変更。LATITUDEのPDFは「LATITUDE用\LATITUDE」へ保存します（場所は今までと同じ）。
- CareLink（medtronic.com / medtroniccarelink.net）からダウンロードしたファイルは「CareLink用\CareLink」へ分けて保存します。
- 拡張機能の更新と、Chromeのダウンロード先の変更（波形認識）は、必ずセットで行ってください。
