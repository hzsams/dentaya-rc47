# RC31 verification evidence

This folder accompanies the source distribution. The JSON result files and logs record checks performed in an isolated Linux environment with Chromium 153. They do not record tests on the user's computer.

- `bundled-language-result.json`: 4,517 source keys, 30 complete translated packs plus Turkish; frontend and Electron catalogs match. Identity, placeholders, numbers, units and required product tokens are checked.
- `translation-quality-audit.json`: corrected English source glossary and selected multilingual dental/view captions; no unresolved generation errors or long English paragraphs copied into translated packs. All 24 official EU language choices are included.
- `ui-browser-result.json`: all 31 languages selected in a real browser; labels, paragraphs, optgroups, file-picker/reset behavior, document direction and user-content protection checked. Form values, tooth selection, DOM refs and canvas identity are preserved. All 56 synthesized audio cues were rendered and checked for distinct, finite, non-clipping output. AYA bridge responses were mocked; model intelligence was not tested.
- `cad-browser-result.json`: real CAD editor and WebGL with two public STL scans; 8 manual tools, 7 tabs, visibility/opacity, numeric brush, sculpt/undo/redo, hidden-object protection, panel movement, mobile controls, preferences, context menu, active tooth and project save. Backend requests are intercepted fixtures and do not write production data. English, German, Arabic and Turkish locale changes preserve the scene and working state.
- `protected-assets.json`: all 42 public scan/anatomy assets match the RC30 baseline byte for byte.
- `full-verify.log` and `release-verification.json`: release/runtime/security, localization, AYA core/IPC, sound/experience, lint/typecheck, deterministic CAD checks, migration/workflow tests and production web build.

Screenshots are development verification fixtures. Software WebGL screenshot capture is optional and can time out independently of functional assertions.

Technical coverage is not native-language editorial approval. Translation was assisted by locally running public models, with documented corrections. No user records or interface strings were sent to a cloud translation service. This update does not certify dental geometry for clinical production, prove assistant inference quality, or establish equivalence to another CAD product.

The Windows NSIS installer was not built or run in this Linux environment. On Windows, preserve the existing `.env.local`, extract the source ZIP and run `DENTAYA_GUNCELLE_DERLE.cmd` as described in `RC31_KULLANIM.md`. No private environment file is included.
