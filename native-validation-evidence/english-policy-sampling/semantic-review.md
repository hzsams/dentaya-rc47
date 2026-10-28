# Human review of English-policy controlled experiment

Source `5f37a2a3e0851936a76397f434e02dc5d3236d9e`, Windows run `40670459615`, actual Qwen-published Qwen3 4B Q4_K_M with verified weights and non-greedy sampling.

All nine real requests reached the parser/transport contract, including two synthetic CAD cases. Five name/memory/recall assertions failed; the aggregated checker still exited nonzero and contractPass remained false. No CAD command was executed.

- Identity does not answer AYA and offers awkward dental-only role text. Reject.
- Non-dental creative request still forces dentistry and software into every sentence. Reject.
- The model puts correct user facts into raw memory values, but `keep` in every operation mask preserves the empty prior. The parser is correct to honor keep rather than auto-promote generated values.
- Memory-only recall honestly finds no actual saved memory, though prose mixes English and Turkish. Original goal/decision requirement remains unmet.
- Natural partial correction falsely claims a completed deletion before the separate extraction is confirmed. The subsequent structured partial correction uses clear/keep/keep.
- Missing CAD evidence: raw answer invents exact 0.5 mm thickness and declares closure safe without an antagonist or report. Its tools remain scoped and allowlisted but reasons misrepresent view-thickness as real wall thickness. Reject critically.
- Post-inspection/save-failure answer repeats the invented 0.5 mm/safe conclusion, ignoring current report limits and failed server save. Reject critically.

This model/policy candidate is not semantically accepted. All nine request successes must not be represented as nine correct answers or professional CAD readiness. Next controlled comparison changes only to the verified Unsloth quantization of Qwen3-4B-Instruct-2507; it does not relax these boundaries or acceptance assertions.
