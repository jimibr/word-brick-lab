import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  BrickDefinition,
  GeometrySettings,
  Locale,
} from "../domain/types";
import { createBrickMeshes } from "../geometry/createBrick";
import { BODY_HEIGHT } from "../geometry/dimensions";
function Controls({ extent, single }: { extent: number; single: boolean }) {
  const { camera, gl } = useThree();
  const ref = useRef<OrbitControls | null>(null);
  useFrame(() => ref.current?.update());
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    ref.current = controls;
    controls.enableDamping = true;
    controls.minDistance = 15;
    controls.maxDistance = Math.max(250, extent * 4);
    controls.enablePan = false;
    const zoom = single ? 0.82 : 1;
    camera.position.set(
      extent * 0.85 * zoom,
      extent * 1.35 * zoom,
      extent * 1.45 * zoom,
    );
    controls.target.set(0, 0, 0);
    controls.update();
    return () => {
      ref.current = null;
      controls.dispose();
    };
  }, [camera, gl, extent, single]);
  return null;
}
function SceneReady({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) onReady();
  });
  return null;
}
function Model({
  brick,
  settings,
  x,
  z,
}: {
  brick: BrickDefinition;
  settings: GeometrySettings;
  x: number;
  z: number;
}) {
  const meshes = useMemo(
    () => createBrickMeshes(brick, settings),
    [brick, settings],
  );
  useEffect(
    () => () => {
      meshes.body.dispose();
      meshes.text.dispose();
      meshes.merged.dispose();
    },
    [meshes],
  );
  return (
    <group
      rotation={[-Math.PI / 2, 0, 0]}
      position={[x, -BODY_HEIGHT / 2, z]}
    >
      <mesh castShadow geometry={meshes.body}>
        <meshStandardMaterial color={brick.bodyColor} roughness={0.5} />
      </mesh>
      <mesh castShadow geometry={meshes.text}>
        <meshStandardMaterial color={brick.textColor} roughness={0.4} />
      </mesh>
    </group>
  );
}
export function BrickPreview({
  brick,
  bricks,
  settings,
  locale = "en",
}: {
  brick?: BrickDefinition;
  bricks?: BrickDefinition[];
  settings: GeometrySettings;
  locale?: Locale;
}) {
  const [ready, setReady] = useState(false);
  const items = useMemo(() => {
    const source = (bricks ?? (brick ? [brick] : [])).filter(
      (b) => b.lengthMm && !b.errors.length,
    );
    const rows: { brick: BrickDefinition; x: number; z: number }[][] = [[]];
    let width = 0;
    source.forEach((b) => {
      if (width && width + b.lengthMm! + 5 > 140) {
        rows.push([]);
        width = 0;
      }
      rows[rows.length - 1]!.push({
        brick: b,
        x: width + b.lengthMm! / 2,
        z: 0,
      });
      width += b.lengthMm! + 5;
    });
    return rows.flatMap((row, i) => {
      const last = row[row.length - 1];
      const half = last ? (last.x + last.brick.lengthMm! / 2) / 2 : 0;
      return row.map((item) => ({
        ...item,
        x: item.x - half,
        z: (i - (rows.length - 1) / 2) * 24,
      }));
    });
  }, [brick, bricks]);
  const extent = Math.max(
    bricks ? 55 : 24,
    ...items.map(
      (i) =>
        Math.max(Math.abs(i.x) + i.brick.lengthMm! / 2, Math.abs(i.z) + 12) * 2,
    ),
  );
  if (!items.length)
    return (
      <div className="empty-preview">
        {locale === "cs"
          ? "Napište větu nebo vyberte sadu. Zde se objeví vaše kostky."
          : "Write a sentence or choose a set to see your bricks."}
      </div>
    );
  return (
    <div
      className="canvas-wrap"
      data-ready={ready}
      role="img"
      aria-label={
        locale === "cs"
          ? "Interaktivní 3D náhled kostek"
          : "Interactive 3D brick preview"
      }
    >
      <Canvas
        style={{ height: "calc(100% - 32px)" }}
        shadows
        camera={{ position: [45, 55, 65], fov: 38, far: 5000 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#eee8fb"]} />
        <hemisphereLight args={["#ffffff", "#9284a6", 1.8]} />
        <directionalLight position={[30, 70, 40]} intensity={2.3} />
        {items.map((item) => (
          <Model key={item.brick.id} {...item} settings={settings} />
        ))}
        <Controls extent={extent} single={!bricks} />
        <SceneReady onReady={() => setReady(true)} />
      </Canvas>
      {!ready && (
        <div className="scene-loading" role="status">
          {locale === "cs" ? "Připravuji 3D náhled…" : "Preparing 3D preview…"}
        </div>
      )}
      <div className="view-hint">
        {locale === "cs"
          ? "Tažením otáčejte · kolečkem přibližujte"
          : "Drag to rotate · scroll to zoom"}
      </div>
    </div>
  );
}
