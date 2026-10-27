# Qwen3 1.7B Q8_0 baseline semantic review

Actual Windows run 40549453352, source commit dedfff12a9b3fb21ca30467cdb2be80331351802. Evidence recorded by CI in 3571f3e. Review of raw replies on 2026-10-27. Native transport occurred; semantic acceptance failed. Seven successful calls refer to transport/schema handling, not successful semantic cases. The checker stopped at the partial-goal-clear assertion, so neither CAD case was attempted.

- `natural-identity`: names AYA, but repeats the question, confuses speaker perspective, and uses awkward Turkish.
- `novel-non-dental-request`: fails the explicit request to avoid dentistry/software; invents broken teeth in all three repetitive sentences and misses the wind-chime perspective.
- `novel-natural-language`: recognizes unit 46, contour preservation, and reducing height, but adds repetitive preparation advice.
- `separate-memory-extraction`: changes a settled user decision into determining whether to reduce; adds two unsupported open questions.
- `working-memory-follow-up`: recovers 46, contour, and lowering; omits that reduction is manual.
- `natural-partial-memory-correction`: claims the goal was cleared.
- `separate-partial-memory-correction`: keeps the entire goal, contradicting the requested clear and the natural reply. Decisions/questions remain unchanged. This triggers the contract failure.
- `cad-missing-evidence` and `cad-tool-results-and-report-limits`: not attempted.

For a controlled comparison, retain prompts, context fixtures, options, assertions, and runtime settings. Change only the officially pinned model.
