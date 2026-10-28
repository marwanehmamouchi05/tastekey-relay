"""Build the downloadable developer extension using a strict source allowlist."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
extension = root / "extension"
(extension / "match.js").write_bytes((root / "apps/web/public/integration/match.js").read_bytes())
output = root / "apps/web/public/downloads/tastekey-extension.zip"
output.parent.mkdir(parents=True, exist_ok=True)
files = ["manifest.json", "background.js", "popup.html", "popup.js", "popup.css", "filter.js", "match.js", "README.md"]
with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
    for name in files:
        info = ZipInfo(name, date_time=(2026, 10, 28, 0, 0, 0))
        info.compress_type = ZIP_DEFLATED
        archive.writestr(info, (extension / name).read_bytes())
print(f"Packaged {len(files)} source files: {output}")
