"""テスト用に最小構成のPDFをその場で生成する（外部ライブラリ不要）。

samples/ 配下には実データしか置かない方針（.gitignoreで*.pdfも除外済み）なので、
テスト用PDFはコミットせずテスト実行時にメモリ上で作る。
"""
from __future__ import annotations


def make_text_pdf(lines: list[str]) -> bytes:
    """Helvetica・1ページのテキストPDFを生成する。ダミー文字列のみで実データは含まない。"""
    objects: list[bytes] = []

    def esc(s: str) -> bytes:
        return s.encode("latin-1").replace(b"\\", rb"\\").replace(b"(", rb"\(").replace(b")", rb"\)")

    content_lines = [b"BT", b"/F1 12 Tf"]
    y = 280
    first = True
    for line in lines:
        if first:
            content_lines.append(f"10 {y} Td".encode())
            first = False
        else:
            content_lines.append(b"0 -18 Td")
        content_lines.append(b"(" + esc(line) + b") Tj")
        y -= 18
    content_lines.append(b"ET")
    content_stream = b"\n".join(content_lines)

    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>"
    )
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    objects.append(
        b"<< /Length " + str(len(content_stream)).encode() + b" >>\nstream\n"
        + content_stream
        + b"\nendstream"
    )

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{i} 0 obj\n".encode() + body + b"\nendobj\n"

    xref_offset = len(out)
    n = len(objects) + 1
    out += f"xref\n0 {n}\n".encode()
    out += b"0000000000 65535 f \n"
    for off in offsets[1:]:
        out += f"{off:010d} 00000 n \n".encode()
    out += (
        f"trailer\n<< /Size {n} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF"
    ).encode()
    return bytes(out)
