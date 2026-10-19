"""Read-only audit of a separately cloned MedQuAD checkout; no data are imported.

python3 scripts/audit-dental-sources.py /tmp/medquad
The text filter is a candidate screen, not a clinician's relevance assessment.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

COMMIT = "577bd37b96c02d1833b2c9eed2de9f96964e96cb"
PINNED_FILES = {
    "readme.txt": "e51e3ef59ec8aa923dd79f2b4132bb3cb1deccbf1b1aca59f3dd668e001397d8",
    "LICENSE.txt": "5b63c5abb5f4218f79230730b3733ce681383e2d656044069b8c73cbdb8e7fb7",
    "4_MPlus_Health_Topics_QA/0000531.xml": "c6ca51cdded8fa3b178dc7dfdd2960e44931cf00b89f918de892fca7ab374a0d",
    "4_MPlus_Health_Topics_QA/0000205.xml": "4a880d0617a988e220ee70279dfcbb62b088e495406c927fb761b43708d6da41",
    "4_MPlus_Health_Topics_QA/0000791.xml": "aee7c9f6cca78a7f57073377f4b516ae04450a0163eb8432b0da83e80b62c5a6",
}
root = Path(sys.argv[1]).resolve()
commit = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
if commit != COMMIT:
    raise SystemExit("Unexpected MedQuAD revision; audit the new source revision separately.")
for name, expected in PINNED_FILES.items():
    if hashlib.sha256((root / name).read_bytes()).hexdigest() != expected:
        raise SystemExit("Source checksum mismatch: " + name)

pattern = re.compile(r"\b(dental|dentist|dentistry|tooth|teeth|gingiv\w*|periodont\w*|bruxism|xerostomia|saliva|salivary|oral|mouth|palate|palatal|jaw|mandib\w*|maxill\w*|cleft lip)\b", re.I)
totals = {"xmlDocuments": 0, "allQuestionAnswerPairs": 0, "nonemptyAnswers": 0, "screenedDocuments": 0, "screenedPairs": 0, "screenedNonemptyAnswers": 0}
documents = []
for path in sorted(root.glob("*/*.xml")):
    document = ET.parse(path).getroot()
    pairs = document.findall(".//QAPair")
    answered = sum(bool((pair.findtext("Answer") or "").strip()) for pair in pairs)
    totals["xmlDocuments"] += 1
    totals["allQuestionAnswerPairs"] += len(pairs)
    totals["nonemptyAnswers"] += answered
    focus = document.findtext("Focus") or ""
    # Exclude clear lexical false positives (the personal name Tooth, oral drug route).
    if not pattern.search(focus) or path.parts[-2].startswith("11_") or "charcot" in focus.lower() or focus == "Oral hypoglycemics overdose":
        continue
    totals["screenedDocuments"] += 1
    totals["screenedPairs"] += len(pairs)
    totals["screenedNonemptyAnswers"] += answered
    documents.append({"file": str(path.relative_to(root)), "focus": focus, "questions": len(pairs), "nonemptyAnswers": answered})

catalogue = json.loads((Path(__file__).resolve().parent.parent / "src/lib/i18n/dental-facts.json").read_text())
matched = 0
for fact in catalogue["facts"]:
    if fact["source"] not in ("jaw-overview", "cleft-overview", "salivary-overview"):
        continue
    evidence = fact["evidence"]
    prefix = f"https://github.com/abachaa/MedQuAD/blob/{COMMIT}/"
    if not evidence["url"].startswith(prefix):
        raise SystemExit("Unpinned evidence URL: " + fact["id"])
    relative = evidence["url"][len(prefix):]
    if relative not in PINNED_FILES:
        raise SystemExit("Unknown evidence source: " + fact["id"])
    answer = ET.parse(root / relative).getroot().findtext(".//Answer") or ""
    if evidence["excerpt"] not in answer:
        raise SystemExit("Source passage mismatch: " + fact["id"])
    matched += 1
print(json.dumps({"commit": commit, "datasetLicense": "CC-BY-4.0", "counts": totals, "newCardPassagesMatched": matched, "screenIsClinicalValidation": False, "pinnedSHA256": PINNED_FILES, "screenedDocuments": documents}, ensure_ascii=False, indent=2))
