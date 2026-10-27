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
