import {
  buildDefaultCadJobSetup,
  normalizeCadJobSetup,
} from "../src/lib/cad-job-setup";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`CAD setup verify failed: ${message}`);
}

const bridge = buildDefaultCadJobSetup(["14", "15", "16"], "Köprü", "Zirkonya");
assert(bridge.units.length === 3, "bridge should have 3 units");
assert(bridge.units[0].role === "abutment", "first bridge unit should be abutment");
assert(bridge.units[1].role === "pontic", "middle bridge unit should default to pontic");
assert(bridge.units[1].design_type === "anatomic_pontic", "middle bridge unit should use anatomic pontic");
assert(bridge.units[2].role === "abutment", "last bridge unit should be abutment");

const temporary = buildDefaultCadJobSetup(["11"], "Geçici Kron", "PMMA");
assert(temporary.units[0]?.design_type === "temporary_crown", "temporary case should map to temporary crown");
assert(temporary.units[0]?.temporary === true, "temporary flag should be true");

const restored = normalizeCadJobSetup(
  {
    ...bridge,
    complete: true,
    units: bridge.units.map((unit) =>
      unit.tooth_code === "14"
        ? { ...unit, design_type: "coping" as const, anatomy_code: "13" }
        : unit,
    ),
  },
  ["14", "15", "16"],
  "Köprü",
  "Zirkonya",
);
assert(restored.complete === true, "valid saved setup should remain complete");
assert(restored.units[0]?.design_type === "coping", "saved restoration type should be preserved");
assert(restored.units[0]?.anatomy_code === "13", "saved anatomy form should be preserved");

const withAddedPontic = normalizeCadJobSetup(
  {
    ...bridge,
    units: [
      ...bridge.units,
      {
        ...buildDefaultCadJobSetup(["13"], "", "Zirkonya").units[0]!,
        id: "unit-13-extra",
        role: "pontic" as const,
        design_type: "anatomic_pontic" as const,
      },
    ],
  },
  ["14", "16"],
  "Köprü",
  "Zirkonya",
);
assert(withAddedPontic.units.some((unit) => unit.tooth_code === "13"), "CAD-added unit should survive normalization");

console.log("CAD job setup verification: PASS");
