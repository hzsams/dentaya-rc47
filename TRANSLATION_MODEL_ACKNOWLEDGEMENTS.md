# Translation build provenance

The original 31-locale set used local CTranslate2 INT8 models during development. The 15 additional RC37 locale packs were machine-translated from approved fixed English interface texts with Bing Translator on 2026-10-12, with dental terminology corrections. Patient records, notes, scan meshes, credentials and source code files were excluded. Model weights and Python translation runtimes are not shipped with DentAYA. The distributed JSON files contain fixed interface translations. No language model is needed to display them.

- Meta M2M100 418M: https://huggingface.co/facebook/m2m100_418M — MIT license. CTranslate2 conversion: https://huggingface.co/auralmira/m2m100-418M-ct2-int8
- Helsinki-NLP OPUS-MT Marian models: https://huggingface.co/Helsinki-NLP and https://opus.nlpl.eu/ — individual upstream model cards record their licenses. Most models used declare Apache 2.0; opus-mt-en-de declares CC BY 4.0. Japanese uses opus-mt-en-jap; Maltese uses opus-mt-en-mt.
- CTranslate2: https://github.com/OpenNMT/CTranslate2 — MIT license.
- SentencePiece: https://github.com/google/sentencepiece — Apache 2.0 license.

Packs record machine-assisted translation provenance. A source-language glossary was reviewed; full native-language editorial review is not claimed. Technical validation checks fixed key coverage, language/manifest identity, numeric data and placeholders. It does not establish clinical safety or equivalence to another CAD product.
