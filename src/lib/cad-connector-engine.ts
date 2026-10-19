import * as THREE from "three";

export type CadConnectorPoint = { x: number; y: number; z: number };

export type CadConnector = {
  id: string;
  a: CadConnectorPoint;
  b: CadConnectorPoint;
  diameterMm: number;
  shape: "round" | "oval";
};

export type ConnectorQuality = {
  lengthMm: number;
  widthMm: number;
  heightMm: number;
  areaMm2: number;
  passesArea: boolean;
  passesWidth: boolean;
  passesHeight: boolean;
  passes: boolean;
};

export function connectorQuality(
  connector: CadConnector,
  minAreaMm2: number,
  minWidthMm: number,
  minHeightMm: number,
): ConnectorQuality {
  const a = new THREE.Vector3(connector.a.x, connector.a.y, connector.a.z);
  const b = new THREE.Vector3(connector.b.x, connector.b.y, connector.b.z);
  const lengthMm = a.distanceTo(b);
  const widthMm = connector.diameterMm;
  const heightMm = connector.shape === "oval" ? connector.diameterMm * 1.2 : connector.diameterMm;
  const areaMm2 =
    connector.shape === "oval"
      ? Math.PI * (widthMm / 2) * (heightMm / 2)
      : Math.PI * Math.pow(connector.diameterMm / 2, 2);

  const passesArea = areaMm2 >= minAreaMm2;
  const passesWidth = widthMm >= minWidthMm;
  const passesHeight = heightMm >= minHeightMm;

  return {
    lengthMm,
    widthMm,
    heightMm,
    areaMm2,
    passesArea,
    passesWidth,
    passesHeight,
    passes: passesArea && passesWidth && passesHeight,
  };
}

export function createConnectorMesh(
  connector: CadConnector,
  material?: THREE.Material,
) {
  const a = new THREE.Vector3(connector.a.x, connector.a.y, connector.a.z);
  const b = new THREE.Vector3(connector.b.x, connector.b.y, connector.b.z);
  const direction = b.clone().sub(a);
  const length = Math.max(direction.length(), 0.001);
  const radius = Math.max(connector.diameterMm / 2, 0.15);
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 28, 1, false);

  if (connector.shape === "oval") {
    geometry.scale(1, 1, 1.2);
  }

  const mesh = new THREE.Mesh(
    geometry,
    material ??
      new THREE.MeshStandardMaterial({
        color: 0x90eadc,
        roughness: 0.42,
        metalness: 0.03,
      }),
  );

  mesh.position.copy(a.clone().add(b).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.userData.connectorId = connector.id;
  return mesh;
}
