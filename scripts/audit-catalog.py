"""Validate every original SVG; repair only the known misplaced url() quote."""
import argparse
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

parser = argparse.ArgumentParser()
parser.add_argument('--repair-known-svg-quote', action='store_true')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
assets = root / 'frontend' / 'public' / 'images'
report = {'files': 0, 'invalid_before': [], 'repaired': [], 'invalid_after': [], 'raster_files': []}
for file in sorted(assets.rglob('*')):
    if not file.is_file():
        continue
    if file.suffix.lower() in {'.jpg', '.jpeg', '.webp', '.png', '.avif'}:
        report['raster_files'].append(str(file.relative_to(assets)))
    if file.suffix.lower() != '.svg':
        continue
    report['files'] += 1
    content = file.read_text(encoding='utf-8')
    try:
        ET.fromstring(content)
    except ET.ParseError:
        report['invalid_before'].append(str(file.relative_to(assets)))
        if args.repair_known_svg_quote:
            repaired = re.sub(r'fill="url\(([^"\)]+)"\)', r'fill="url(\1)"', content)
            try:
                ET.fromstring(repaired)
            except ET.ParseError:
                pass
            else:
                if repaired != content:
                    file.write_text(repaired, encoding='utf-8')
                    report['repaired'].append(str(file.relative_to(assets)))
                    content = repaired
    try:
        ET.fromstring(content)
    except ET.ParseError:
        report['invalid_after'].append(str(file.relative_to(assets)))
out = root / 'docs' / 'catalog-asset-audit.json'
out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f"SVG: {report['files']}; invalid before: {len(report['invalid_before'])}; repaired: {len(report['repaired'])}; invalid after: {len(report['invalid_after'])}; raster: {len(report['raster_files'])}")
raise SystemExit(bool(report['invalid_after']))
