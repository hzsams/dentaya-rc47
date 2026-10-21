"""Compatibility entry point for the shared SVG → PNG/ICO export pipeline.

Every ICO frame is rendered at its native size by render-brand-assets.mjs.
The catalog and artwork remain the same as the application choices.
"""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
subprocess.run(['node', str(root / 'scripts/render-brand-assets.mjs')], cwd=root, check=True)
