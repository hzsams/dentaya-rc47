# Human review of controlled Turkish-policy sampling experiment

Reviewed against the raw Windows report for source `56db1b88ea89693d87653164d57c130a43ba6fe9`, run `40668735585` (2026-10-28).

The Qwen-published Qwen3 4B Q4_K_M bytes and SHA-256 were verified before actual CPU inference. No mock inference or executable CAD operation occurred. Four requests succeeded at the transport/validation level, but the acceptance contract failed. Later memory correction and both CAD cases were not attempted by this fail-fast checker.

- Identity: provides AYA, but asks several unnecessary follow-up questions and does not simply answer name and purpose. Reject as an acceptable professional identity interaction.
- Creative non-dental task: explicitly introduces dentistry and software into all three sentences, reversing the user's clear constraint. Reject.
- Work plan: repeats the user's imperative almost verbatim, rather than a natural acknowledgment. No CAD execution was claimed or performed.
- Memory: raw generated JSON contains the correct unit 46 and contour decision, but sets every patch operation to `keep`. The unchanged memory parser correctly retains the empty prior memory. Do not reinterpret `keep` as permission to set values merely because generated values are populated.

Using non-greedy sampling shortened the identity output compared with the 606-token greedy repetition. It did not resolve instruction following or valid memory operation selection. This candidate is not approved for semantic acceptance. Source-level/mock test passes are not evidence of conversational quality.
