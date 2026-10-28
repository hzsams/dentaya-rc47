# Isolated native model comparison

This branch is diagnostic and does not release a Windows EXE. Model weights are downloaded to a temporary CI directory and are never committed or bundled. CAD cases use synthetic state fixtures and do not execute real geometry operations.

## Immutable checkpoints

- `3571f3e`: actual Windows 1.7B result from run `40549453352`, tested source `dedfff12a9b3fb21ca30467cdb2be80331351802`.
- `acb49ce`: metadata-only discovery workflow, no model installation or inference attempt.
- `faa7e81`: official 4B metadata evidence from successful Windows run `40601483796`.
- `e43e997`: controlled 4B source; actual Windows run `40601617397`. Original 1.7B evidence preserved in `baseline-1.7b/` before reports are overwritten.

The 4B comparison changes only the MODEL object in `electron/aya/managed-runtime.cjs`: identifier, filename, label, immutable official download URL, byte count and SHA-256. The engine, all prompts, context fixtures, generation options, conversation/memory/CAD routing, checker, assertions and wrapper are unchanged from the 1.7B run. The CI metadata target and evidence archiving are bookkeeping changes.

Official 4B metadata was fetched from `https://huggingface.co/api/models/Qwen/Qwen3-4B-GGUF?blobs=true`, then re-fetched at its immutable repository revision. `official-4b-metadata.json` records the exact Q4_K_M filename/LFS size/hash, repository revision, Apache-2.0 license and source URLs. This metadata evidence alone is not a native or quality pass.

## Review boundaries

Transport/schema contract success does not imply semantic acceptance. Review every raw reply against its prompt, preserved state and tool evidence. The checker intentionally retains fail-fast assertions for the controlled comparison; later cases may therefore be unattempted. Do not count them as successful.

A GitHub Windows CPU runner is not the user's Windows computer. Its timing does not establish latency on the user's 16 GB RAM / 512 GB SSD machine. It does verify actual Windows process execution, official asset hashes, loopback transport and model output under the recorded source.

## Direct template controls and current Qwen3.5 candidate

The later `template-controls/` experiment tested eight actual Windows model calls with the pinned Unsloth Qwen3-4B-Instruct-2507 quantization. Exact system/user messages and rendered llama.cpp templates are preserved. Basic name/purpose questions answered AYA through both direct inference and the application bridge, in English and Turkish. The same Turkish negative creative constraint was violated even with only a minimal system prompt and no application context. Adjacent context/user messages did not break basic identity. This rules out missing current prompts or a mismatched template in those controlled cases; it does not certify the old model's Turkish instruction following.

Candidate source `08899dc` (run `40728527664`) changes to the verified Unsloth quantization of official `Qwen/Qwen3.5-4B`, with adjacent per-field memory operations. Its immutable publisher revision is `e87f176479d0855a907a41277aca2f8ee7a09523`, file `Qwen3.5-4B-Q4_K_M.gguf`, 2,740,937,888 bytes, SHA-256 `00fe7986ff5f6b463e62455821146049db6f9313603938a70800d1fb69ef11a4`. Publisher/base-model license metadata and model-card sampling guidance are in `qwen35-discovery/`. Metadata and unit checks alone do not establish model quality.

The memory grammar puts each keep/set/clear or keep/replace operation next to its own value. A keep operation cannot carry detached new facts. The adapter maps validated operations to the established patch parser, preserving latest-user full-reset authority and rejecting actions, excess keys and out-of-range data. No model-generated value is silently promoted under keep.

Only the pinned built-in model or that same imported content hash receives the card's non-thinking sampling profile. Unrelated GGUF selections retain their existing temperature behavior. The default nine-case acceptance keeps every earlier assertion, aggregating semantic/name/memory failures rather than skipping the later CAD cases. Transport, structured-output, scope and tool boundaries remain strict. Raw answers still require review, especially missing antagonist/report evidence and failed save state.

Diagnostic runs now retain pinned engine/model bytes in a GitHub Actions cache outside source and installer artifacts. Production installation rechecks sizes and SHA-256 on every restored cache; the cache-save step separately rechecks both the engine archive and model. A semantic failure may retain verified bytes for a later experiment, but cannot become a semantic pass. Candidate inference and semantic acceptance remain pending until actual reports are reviewed.
