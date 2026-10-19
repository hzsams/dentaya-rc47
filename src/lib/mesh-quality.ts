import * as THREE from "three";

export type MeshTopologyMode =
  | "full"
  | "large-mesh-sampled";

export type MeshIntakeStatus =
  | "ready"
  | "warning"
  | "reject";

export type MeshQualityAnalysis = {
  invalidVertexCount: number;
  degenerateTriangleCount: number;
  boundaryEdgeCount: number | null;
  nonManifoldEdgeCount: number | null;
  analyzedTriangleCount: number;
  topologyMode: MeshTopologyMode;
  unitHint:
    | "plausible-mm"
    | "suspicious-small"
    | "suspicious-large";
  intakeStatus: MeshIntakeStatus;
  warnings: string[];
};

const MAX_FULL_TOPOLOGY_TRIANGLES =
  180_000;

export function analyzeMeshGeometry(
  geometry: THREE.BufferGeometry
): MeshQualityAnalysis {
  const position =
    geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute | undefined;

  if (
    !position ||
    position.count < 3
  ) {
    return {
      invalidVertexCount: 0,
      degenerateTriangleCount: 0,
      boundaryEdgeCount: null,
      nonManifoldEdgeCount: null,
      analyzedTriangleCount: 0,
      topologyMode: "full",
      unitHint: "suspicious-small",
      intakeStatus: "reject",
      warnings: [
        "Mesh üçgen verisi bulunamadı.",
      ],
    };
  }

  // TypeScript does not preserve the `position` narrowing inside
  // nested helper functions. Capture the validated attribute in a
  // non-optional constant so readVertex() can safely close over it.
  const safePosition: THREE.BufferAttribute =
    position;

  geometry.computeBoundingBox();

  const box =
    geometry.boundingBox ??
    new THREE.Box3();

  const size =
    new THREE.Vector3();

  box.getSize(size);

  const maxDimension =
    Math.max(
      size.x,
      size.y,
      size.z
    );

  const diagonal =
    Math.max(
      size.length(),
      0.001
    );

  const index =
    geometry.index;

  const triangleCount =
    index
      ? Math.floor(
          index.count / 3
        )
      : Math.floor(
          safePosition.count / 3
        );

  const fullTopology =
    triangleCount <=
    MAX_FULL_TOPOLOGY_TRIANGLES;

  const step =
    fullTopology
      ? 1
      : Math.max(
          1,
          Math.ceil(
            triangleCount /
              100_000
          )
        );

  const tolerance =
    Math.max(
      diagonal * 1e-6,
      1e-5
    );

  const inverseTolerance =
    1 / tolerance;

  const edgeCounts =
    fullTopology
      ? new Map<
          string,
          number
        >()
      : null;

  let invalidVertexCount = 0;
  let degenerateTriangleCount =
    0;
  let analyzedTriangleCount = 0;

  const a =
    new THREE.Vector3();
  const b =
    new THREE.Vector3();
  const c =
    new THREE.Vector3();

  const ab =
    new THREE.Vector3();
  const ac =
    new THREE.Vector3();

  const areaEpsilon =
    Math.max(
      diagonal *
        diagonal *
        1e-12,
      1e-12
    );

  function readVertex(
    rawIndex: number,
    target: THREE.Vector3
  ) {
    target.set(
      safePosition.getX(rawIndex),
      safePosition.getY(rawIndex),
      safePosition.getZ(rawIndex)
    );

    if (
      !Number.isFinite(
        target.x
      ) ||
      !Number.isFinite(
        target.y
      ) ||
      !Number.isFinite(
        target.z
      )
    ) {
      invalidVertexCount += 1;
      return false;
    }

    return true;
  }

  function vertexKey(
    point: THREE.Vector3
  ) {
    return [
      Math.round(
        point.x *
          inverseTolerance
      ),
      Math.round(
        point.y *
          inverseTolerance
      ),
      Math.round(
        point.z *
          inverseTolerance
      ),
    ].join(",");
  }

  function addEdge(
    from: string,
    to: string
  ) {
    if (!edgeCounts) return;

    const key =
      from < to
        ? `${from}|${to}`
        : `${to}|${from}`;

    edgeCounts.set(
      key,
      (
        edgeCounts.get(
          key
        ) ?? 0
      ) + 1
    );
  }

  for (
    let triangle = 0;
    triangle <
    triangleCount;
    triangle += step
  ) {
    const base =
      triangle * 3;

    const ia =
      index
        ? index.getX(base)
        : base;

    const ib =
      index
        ? index.getX(
            base + 1
          )
        : base + 1;

    const ic =
      index
        ? index.getX(
            base + 2
          )
        : base + 2;

    const validA =
      readVertex(
        ia,
        a
      );

    const validB =
      readVertex(
        ib,
        b
      );

    const validC =
      readVertex(
        ic,
        c
      );

    analyzedTriangleCount += 1;

    if (
      !validA ||
      !validB ||
      !validC
    ) {
      continue;
    }

    ab.subVectors(
      b,
      a
    );

    ac.subVectors(
      c,
      a
    );

    const doubleArea =
      ab
        .clone()
        .cross(ac)
        .lengthSq();

    if (
      doubleArea <=
      areaEpsilon
    ) {
      degenerateTriangleCount +=
        1;
    }

    if (edgeCounts) {
      const ka =
        vertexKey(a);
      const kb =
        vertexKey(b);
      const kc =
        vertexKey(c);

      addEdge(ka, kb);
      addEdge(kb, kc);
      addEdge(kc, ka);
    }
  }

  let boundaryEdgeCount:
    number | null = null;

  let nonManifoldEdgeCount:
    number | null = null;

  if (edgeCounts) {
    boundaryEdgeCount = 0;
    nonManifoldEdgeCount = 0;

    for (
      const count of
        edgeCounts.values()
    ) {
      if (count === 1) {
        boundaryEdgeCount += 1;
      } else if (
        count > 2
      ) {
        nonManifoldEdgeCount += 1;
      }
    }
  }

  const unitHint:
    MeshQualityAnalysis["unitHint"] =
    maxDimension < 8
      ? "suspicious-small"
      : maxDimension > 250
        ? "suspicious-large"
        : "plausible-mm";

  const warnings:
    string[] = [];

  if (
    invalidVertexCount > 0
  ) {
    warnings.push(
      "Mesh içinde geçersiz sayısal koordinatlar bulundu."
    );
  }

  if (
    degenerateTriangleCount >
    0
  ) {
    warnings.push(
      `${degenerateTriangleCount} dejenere üçgen tespit edildi${
        fullTopology
          ? ""
          : " (örneklem)"
      }.`
    );
  }

  if (
    nonManifoldEdgeCount !==
      null &&
    nonManifoldEdgeCount >
      0
  ) {
    warnings.push(
      `${nonManifoldEdgeCount} non-manifold kenar bulundu. CAD işlemlerinden önce mesh repair gerekebilir.`
    );
  }

  if (
    unitHint ===
    "suspicious-small"
  ) {
    warnings.push(
      "Model boyutu dental tarama için çok küçük görünüyor; STL birimini doğrula."
    );
  }

  if (
    unitHint ===
    "suspicious-large"
  ) {
    warnings.push(
      "Model boyutu dental tarama için çok büyük görünüyor; STL birimini doğrula."
    );
  }

  if (
    !fullTopology
  ) {
    warnings.push(
      "Mesh çok büyük olduğu için topoloji kontrolü örneklem üzerinden yapıldı; açık/non-manifold kenar sayısı hesaplanmadı."
    );
  }

  const reject =
    triangleCount <= 0 ||
    invalidVertexCount > 0 ||
    (
      analyzedTriangleCount >
        0 &&
      degenerateTriangleCount /
          analyzedTriangleCount >
        0.05
    );

  return {
    invalidVertexCount,
    degenerateTriangleCount,
    boundaryEdgeCount,
    nonManifoldEdgeCount,
    analyzedTriangleCount,
    topologyMode:
      fullTopology
        ? "full"
        : "large-mesh-sampled",
    unitHint,
    intakeStatus:
      reject
        ? "reject"
        : warnings.length
          ? "warning"
          : "ready",
    warnings,
  };
}
