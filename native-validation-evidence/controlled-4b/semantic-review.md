# Controlled Qwen3 4B Q4_K_M semantic review

Reviewed actual raw replies from Windows run `40601617397`, tested commit `e43e997c6b249b77bd2ca5e7f2d37e6b9e82a88e`, evidence commit `7d87b82`, on 2026-10-27. This review was performed by the coding agent; separate human acceptance remains pending. Native inference and official model byte/hash verification occurred. The contract failed after seven calls at the unchanged partial-goal-clear assertion. The two CAD cases were not reached.

Source-info hashes match the 1.7B baseline for `aya-local.cjs`, `core.cjs`, `agent.cjs`, the checker and wrapper. Only `managed-runtime.cjs` differs; its source diff changes only the MODEL object. The engine archive and actual Windows engine binary SHA-256 match the baseline.

| Case | Evidence and semantic assessment |
| --- | --- |
| `natural-identity` | Says AYA, then tells the user how to speak instead of answering the requested name/purpose naturally. It falsely says the application does not store personal information or medical records, although DentAYA includes patient/case records. The prose remains awkward and narrows the product to dental medical tasks. |
| `novel-non-dental-request` | Produces three more coherent lines than 1.7B, but the wind chime does not speak naturally in first person to children. It explicitly appends “Bu cümleler, diş tıraşı sırasında kullanılan bir yazılımın kullanıcıya hitap etmesini sağlayabilir.” This directly violates the user instruction to avoid dentistry/software. Novelty/topic adherence therefore still fails. |
| `novel-natural-language` | Correctly identifies unit 46, implant crown, contour preservation and lowering height without claiming a CAD action. Less repetitive than 1.7B; the natural acknowledgement omits the manual reduction detail. |
| `separate-memory-extraction` | Clear improvement: stores the exact decision “dış konturu koruyup oklüzal yüksekliği elle azaltmak”, retains 46 in the goal, and adds no invented open questions. Unlike 1.7B it does not turn the decision into an unresolved choice. |
| `working-memory-follow-up` | Recovers 46, outer contour and lowering using memory alone. It omits manual reduction, so the recalled decision is abbreviated. |
| `natural-partial-memory-correction` | Claims “Çalışma hedefini kaldırdım” before the separate update has succeeded. This claim is contradicted by the following memory result. |
| `separate-partial-memory-correction` | Keeps the entire previous goal despite the explicit request to remove only that goal. Decisions and open questions remain intact. The unchanged assertion correctly fails. |
| `cad-missing-evidence` | Not attempted; no evidence for this model's CAD safety language or proposals. |
| `cad-tool-results-and-report-limits` | Not attempted; no evidence that this model respects failed saves or shell-offset limits. |

## Comparative conclusion

4B improves the initial extraction and general fluency over 1.7B, but the current architecture still fails negative topic constraints, reliable partial memory edits and truthful completion language. Increasing model size alone did not satisfy semantic acceptance. Neither run establishes CAD model acceptance. Seven successful calls mean transport/schema handling only.

The 1.7B wrapper recorded 136813 ms; the 4B wrapper recorded 173630 ms. Both include installation/checker work on GitHub Windows CPU runners and stop after seven calls. These are not per-turn latency guarantees on the user's machine.
