import * as THREE from "three";

export type RegistrationResult = {
  matrix: THREE.Matrix4;
  rms: number;
  pairCount: number;
};

type Hash = {
  map: Map<string, THREE.Vector3[]>;
  cell: number;
};

export function rigidRegisterGeometry(
  reference: THREE.BufferGeometry,
  moving: THREE.BufferGeometry,
  iterations = 5
): RegistrationResult {
  const referencePoints =
    sampleGeometry(
      reference,
      3500
    );

  const movingPoints =
    sampleGeometry(
      moving,
      3500
    );

  if (
    referencePoints.length < 12 ||
    movingPoints.length < 12
  ) {
    return {
      matrix:
        new THREE.Matrix4(),
      rms: Infinity,
      pairCount: 0,
    };
  }

  const box =
    new THREE.Box3().setFromPoints(
      referencePoints
    );

  const size =
    new THREE.Vector3();

  box.getSize(size);

  const cell =
    Math.max(
      size.length() /
        80,
      0.35
    );

  const hash =
    buildHash(
      referencePoints,
      cell
    );

  let transform =
    new THREE.Matrix4();

  let rms =
    Infinity;

  let pairCount =
    0;

  for (
    let iteration = 0;
    iteration < iterations;
    iteration++
  ) {
    const source:
      THREE.Vector3[] = [];

    const target:
      THREE.Vector3[] = [];

    let squared = 0;

    for (
      const original of
        movingPoints
    ) {
      const current =
        original
          .clone()
          .applyMatrix4(
            transform
          );

      const nearest =
        nearestPoint(
          current,
          hash
        );

      if (!nearest) {
        continue;
      }

      const distance =
        current.distanceTo(
          nearest
        );

      const maxDistance =
        Math.max(
          size.length() *
            0.12,
          2
        );

      if (
        distance >
        maxDistance
      ) {
        continue;
      }

      source.push(
        original
      );

      target.push(
        nearest
      );

      squared +=
        distance *
        distance;
    }

    if (
      source.length < 10
    ) {
      break;
    }

    pairCount =
      source.length;

    rms =
      Math.sqrt(
        squared /
          source.length
      );

    transform =
      solveRigidHorn(
        source,
        target
      );
  }

  return {
    matrix: transform,
    rms,
    pairCount,
  };
}

export function nearestDistanceField(
  reference: THREE.BufferGeometry,
  query: THREE.BufferGeometry
) {
  const referencePoints =
    sampleGeometry(
      reference,
      45_000
    );

  const queryPosition =
    query.getAttribute(
      "position"
    ) as THREE.BufferAttribute;

  const box =
    new THREE.Box3().setFromPoints(
      referencePoints
    );

  const size =
    new THREE.Vector3();

  box.getSize(size);

  const hash =
    buildHash(
      referencePoints,
      Math.max(
        size.length() /
          100,
        0.25
      )
    );

  const distances =
    new Float32Array(
      queryPosition.count
    );

  for (
    let i = 0;
    i <
    queryPosition.count;
    i++
  ) {
    const point =
      new THREE.Vector3(
        queryPosition.getX(i),
        queryPosition.getY(i),
        queryPosition.getZ(i)
      );

    const nearest =
      nearestPoint(
        point,
        hash
      );

    distances[i] =
      nearest
        ? point.distanceTo(
            nearest
          )
        : 0;
  }

  return distances;
}

function sampleGeometry(
  geometry: THREE.BufferGeometry,
  maxPoints: number
) {
  const position =
    geometry.getAttribute(
      "position"
    ) as THREE.BufferAttribute;

  const step =
    Math.max(
      1,
      Math.ceil(
        position.count /
          maxPoints
      )
    );

  const points:
    THREE.Vector3[] = [];

  for (
    let i = 0;
    i < position.count;
    i += step
  ) {
    points.push(
      new THREE.Vector3(
        position.getX(i),
        position.getY(i),
        position.getZ(i)
      )
    );
  }

  return points;
}

function buildHash(
  points: THREE.Vector3[],
  cell: number
): Hash {
  const map =
    new Map<
      string,
      THREE.Vector3[]
    >();

  for (
    const point of points
  ) {
    const key =
      pointKey(
        point,
        cell
      );

    const bucket =
      map.get(key);

    if (bucket) {
      bucket.push(
        point
      );
    } else {
      map.set(
        key,
        [point]
      );
    }
  }

  return {
    map,
    cell,
  };
}

function nearestPoint(
  point: THREE.Vector3,
  hash: Hash
) {
  const cx =
    Math.floor(
      point.x /
        hash.cell
    );

  const cy =
    Math.floor(
      point.y /
        hash.cell
    );

  const cz =
    Math.floor(
      point.z /
        hash.cell
    );

  let nearest:
    THREE.Vector3 | null =
    null;

  let best =
    Infinity;

  for (
    let radius = 0;
    radius <= 6;
    radius++
  ) {
    let found =
      false;

    for (
      let x = cx - radius;
      x <= cx + radius;
      x++
    ) {
      for (
        let y = cy - radius;
        y <= cy + radius;
        y++
      ) {
        for (
          let z = cz - radius;
          z <= cz + radius;
          z++
        ) {
          if (
            radius > 0 &&
            x > cx - radius &&
            x < cx + radius &&
            y > cy - radius &&
            y < cy + radius &&
            z > cz - radius &&
            z < cz + radius
          ) {
            continue;
          }

          const bucket =
            hash.map.get(
              `${x}:${y}:${z}`
            );

          if (!bucket) {
            continue;
          }

          found = true;

          for (
            const candidate of
              bucket
          ) {
            const d =
              point.distanceToSquared(
                candidate
              );

            if (d < best) {
              best = d;
              nearest =
                candidate;
            }
          }
        }
      }
    }

    if (found) {
      break;
    }
  }

  return nearest;
}

function pointKey(
  point: THREE.Vector3,
  cell: number
) {
  return [
    Math.floor(
      point.x / cell
    ),
    Math.floor(
      point.y / cell
    ),
    Math.floor(
      point.z / cell
    ),
  ].join(":");
}

function solveRigidHorn(
  source:
    THREE.Vector3[],
  target:
    THREE.Vector3[]
) {
  const sourceCenter =
    centroid(source);

  const targetCenter =
    centroid(target);

  let sxx = 0;
  let sxy = 0;
  let sxz = 0;
  let syx = 0;
  let syy = 0;
  let syz = 0;
  let szx = 0;
  let szy = 0;
  let szz = 0;

  for (
    let i = 0;
    i < source.length;
    i++
  ) {
    const a =
      source[i]
        .clone()
        .sub(
          sourceCenter
        );

    const b =
      target[i]
        .clone()
        .sub(
          targetCenter
        );

    sxx += a.x * b.x;
    sxy += a.x * b.y;
    sxz += a.x * b.z;

    syx += a.y * b.x;
    syy += a.y * b.y;
    syz += a.y * b.z;

    szx += a.z * b.x;
    szy += a.z * b.y;
    szz += a.z * b.z;
  }

  const trace =
    sxx +
    syy +
    szz;

  const n = [
    [
      trace,
      syz - szy,
      szx - sxz,
      sxy - syx,
    ],
    [
      syz - szy,
      sxx - syy - szz,
      sxy + syx,
      szx + sxz,
    ],
    [
      szx - sxz,
      sxy + syx,
      -sxx + syy - szz,
      syz + szy,
    ],
    [
      sxy - syx,
      szx + sxz,
      syz + szy,
      -sxx - syy + szz,
    ],
  ];

  let q = [
    1,
    0,
    0,
    0,
  ];

  for (
    let iteration = 0;
    iteration < 24;
    iteration++
  ) {
    const next = [
      n[0][0] * q[0] +
        n[0][1] * q[1] +
        n[0][2] * q[2] +
        n[0][3] * q[3],

      n[1][0] * q[0] +
        n[1][1] * q[1] +
        n[1][2] * q[2] +
        n[1][3] * q[3],

      n[2][0] * q[0] +
        n[2][1] * q[1] +
        n[2][2] * q[2] +
        n[2][3] * q[3],

      n[3][0] * q[0] +
        n[3][1] * q[1] +
        n[3][2] * q[2] +
        n[3][3] * q[3],
    ];

    const norm =
      Math.hypot(
        ...next
      ) || 1;

    q =
      next.map(
        (value) =>
          value /
          norm
      );
  }

  const quaternion =
    new THREE.Quaternion(
      q[1],
      q[2],
      q[3],
      q[0]
    ).normalize();

  const rotation =
    new THREE.Matrix4().makeRotationFromQuaternion(
      quaternion
    );

  const rotatedCenter =
    sourceCenter
      .clone()
      .applyMatrix4(
        rotation
      );

  const translation =
    targetCenter
      .clone()
      .sub(
        rotatedCenter
      );

  const transform =
    rotation.clone();

  transform.setPosition(
    translation
  );

  return transform;
}

function centroid(
  points:
    THREE.Vector3[]
) {
  const center =
    new THREE.Vector3();

  for (
    const point of points
  ) {
    center.add(
      point
    );
  }

  return center.divideScalar(
    Math.max(
      points.length,
      1
    )
  );
}
