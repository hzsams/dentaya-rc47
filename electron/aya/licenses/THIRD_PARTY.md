# AYA local inference components

AYA Core, its knowledge records and CAD context integration are DentAYA application components. They do not constitute training a new foundation model.

- **llama.cpp b9380** — ggml-org/llama.cpp, MIT. License: `llama.cpp-MIT.txt`. Official release: https://github.com/ggml-org/llama.cpp/releases/tag/b9380 . Windows CPU archive SHA-256: `cd44b61422671f0565cae98d856a70d55ef10392197a49246671f85bacb50dc3`.
- **Qwen3-1.7B-Q8_0 GGUF** — Qwen Team, Apache-2.0. License: `Qwen3-Apache-2.0.txt`. Official repository: https://huggingface.co/Qwen/Qwen3-1.7B-GGUF . Pinned revision: `90862c4b9d2787eaed51d12237eafdfe7c5f6077`. Model SHA-256: `061b54daade076b5d3362dac252678d17da8c68f07560be70818cace6590cb1a`.
- **fflate 0.8.2** — 101arrowz, MIT. Used for verified engine archive extraction; package copyright/license is included by the package manager in the desktop dependency.

The native engine and model weights are downloaded on the user's first setup; they are not embedded in the source ZIP. The original engine archive is retained in the user profile. Imported third-party GGUF models retain their own applicable licenses.

API reference: https://github.com/ggml-org/llama.cpp/blob/b9380/tools/server/README.md . Installation uses a loopback-only server with authentication; chat data is not sent to the download hosts.
