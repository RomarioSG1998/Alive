
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Vector2, Entity, ResourceType } from '../types';
import { CameraMode } from '../App';
import { FootstepParticles } from './VFX';

interface GameWorldProps {
  playerPosition: Vector2;
  entities: Entity[];
  worldSize: number;
  islandRadius: number;
  velocity: THREE.Vector2;
  onUpdatePosition: (pos: Vector2, vel: THREE.Vector2) => void;
  onFootstep?: (isWet: boolean) => void;
  keysPressed: React.MutableRefObject<{ [key: string]: boolean }>;
  cameraMode: CameraMode;
}

const lerpAngle = (start: number, end: number, t: number) => {
  const shortestAngle = ((((end - start) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return start + shortestAngle * t;
};

const MasterController: React.FC<{
  worldSize: number;
  islandRadius: number;
  entities: Entity[];
  onUpdate: (pos: Vector2, vel: THREE.Vector2) => void;
  onFootstep?: (isWet: boolean) => void;
  keys: React.MutableRefObject<{ [key: string]: boolean }>;
  mode: CameraMode;
  initialPos: Vector2;
}> = ({ worldSize, islandRadius, entities, onUpdate, onFootstep, keys, mode, initialPos }) => {
  const { camera } = useThree();
  const playerRef = useRef<THREE.Group>(null);
  const internalVel = useRef(new THREE.Vector2(0, 0));
  const walkTime = useRef(0);
  const lastStateSync = useRef(0);
  const lastFootIndex = useRef(-1);
  const initialized = useRef(false);

  useEffect(() => {
    if (playerRef.current && !initialized.current) {
      playerRef.current.position.set(initialPos.x, 0, initialPos.y);
      initialized.current = true;
    }
  }, [initialPos]);

  useFrame((state, delta) => {
    if (!playerRef.current || !internalVel.current) return;

    const d = Math.min(delta, 0.1);
    const isRunning = keys.current['ShiftLeft'] || keys.current['ShiftRight'];

    const pPos = playerRef.current.position;
    const distFromCenter = Math.hypot(pPos.x - worldSize / 2, pPos.z - worldSize / 2);
    const inWater = distFromCenter > islandRadius;

    // Speed Tuning: Reduced for realistic human scale
    // Walk: 85 units/sec (was 160)
    // Run: 160 units/sec (was 300)
    const maxSpeed = isRunning ? (inWater ? 100 : 160) : (inWater ? 60 : 85);

    // Physics: Slower acceleration for weight, higher friction for stops
    const accel = (isRunning ? 600 : 400) * (inWater ? 0.6 : 1.0);
    const friction = inWater ? 10 : 7.5;

    const input = new THREE.Vector2(0, 0);
    if (keys.current['KeyW'] || keys.current['ArrowUp']) input.y -= 1;
    if (keys.current['KeyS'] || keys.current['ArrowDown']) input.y += 1;
    if (keys.current['KeyA'] || keys.current['ArrowLeft']) input.x -= 1;
    if (keys.current['KeyD'] || keys.current['ArrowRight']) input.x += 1;

    if (input.length() > 0) {
      input.normalize().multiplyScalar(accel * d);
      internalVel.current.add(input);
    }

    internalVel.current.multiplyScalar(1 - friction * d);
    if (internalVel.current.length() > maxSpeed) internalVel.current.setLength(maxSpeed);
    if (internalVel.current.length() < 1.0) internalVel.current.set(0, 0);

    const nextX = pPos.x + internalVel.current.x * d;
    const nextZ = pPos.z + internalVel.current.y * d;
    const playerRadius = 1.5; // Reduced from 8 to match visual size (0.4 width)
    const solidTypes = [ResourceType.WOOD, ResourceType.STONE, ResourceType.STRUCTURE, ResourceType.DECOR_TREE];

    if (entities && Array.isArray(entities)) {
      for (const ent of entities) {
        if (!ent || !ent.pos || !solidTypes.includes(ent.type as ResourceType)) continue;
        const dx = nextX - ent.pos.x;
        const dz = nextZ - ent.pos.y;
        const dist = Math.sqrt(dx * dx + dz * dz);

        // Dynamic radius based on type to match visuals
        let typeRadius = 2.0;
        if (ent.type === ResourceType.WOOD) typeRadius = 1.5; // Tree trunk is thin
        else if (ent.type === ResourceType.STONE) typeRadius = 3.0; // Rocks are wider
        else if (ent.type === ResourceType.STRUCTURE) typeRadius = 5.0;

        const entRadius = typeRadius * (ent.size || 1);
        const minDist = playerRadius + entRadius;

        if (dist < minDist) {
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = minDist - dist;
          pPos.x += nx * overlap;
          pPos.z += nz * overlap;
          const dot = internalVel.current.x * nx + internalVel.current.y * nz;
          internalVel.current.x -= nx * dot * 1.05;
          internalVel.current.y -= nz * dot * 1.05;
        }
      }
    }

    // World Boundary (Square)
    let newX = THREE.MathUtils.clamp(pPos.x + internalVel.current.x * d, 0, worldSize);
    let newZ = THREE.MathUtils.clamp(pPos.z + internalVel.current.y * d, 0, worldSize);

    // Island Boundary (Radial) - Prevent walking into water
    const dist = Math.hypot(newX - worldSize / 2, newZ - worldSize / 2);
    // 5 unit buffer to stop right at the water's edge
    const maxDist = islandRadius - 5;

    if (dist > maxDist) {
      const angle = Math.atan2(newZ - worldSize / 2, newX - worldSize / 2);
      newX = (worldSize / 2) + Math.cos(angle) * maxDist;
      newZ = (worldSize / 2) + Math.sin(angle) * maxDist;

      // Kill velocity components moving outwards (simple slide along edge)
      internalVel.current.multiplyScalar(0.5);
    }

    pPos.x = newX;
    pPos.z = newZ;

    const speed = internalVel.current.length();

    if (speed > 5) {
      // Animation Sync: 
      // 0.08 multiplier (was 0.055) = faster steps for the same speed
      // This reduces the "moonwalking" slide effect by matching foot speed to ground speed better.
      walkTime.current += d * speed * (inWater ? 0.06 : 0.08);
      const currentPhaseIndex = Math.floor(walkTime.current / Math.PI);
      if (currentPhaseIndex !== lastFootIndex.current) {
        lastFootIndex.current = currentPhaseIndex;
        onFootstep?.(inWater);
      }
      const targetRotation = Math.atan2(internalVel.current.x, internalVel.current.y);
      playerRef.current.rotation.y = lerpAngle(playerRef.current.rotation.y, targetRotation, 0.15);
    } else {
      walkTime.current = lerpAngle(walkTime.current, Math.round(walkTime.current / Math.PI) * Math.PI, 0.1);
    }

    let camTarget = new THREE.Vector3();
    let lookTarget = new THREE.Vector3();

    if (mode === '3P') {
      // Improved Camera: Closer, lower, and more dynamic
      // Base offset: (0, 14, 18) instead of (0, 26, 25) for a more immersive angle
      const camHeight = 14 + (speed * 0.015);
      const camDist = 18 + (speed * 0.025);

      camTarget.set(pPos.x, camHeight, pPos.z + camDist);

      // Look slightly above the player, into the distance
      lookTarget.set(pPos.x, 2.5, pPos.z - 10);
    } else if (mode === '1P') {
      const bobY = Math.sin(walkTime.current) * (speed * 0.0006);
      camTarget.set(pPos.x, 1.76 + bobY, pPos.z);
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(playerRef.current.rotation);
      lookTarget.copy(camTarget).add(forward.multiplyScalar(10));
    } else {
      camTarget.set(pPos.x, 4, pPos.z - 16);
      lookTarget.set(pPos.x, 1.6, pPos.z);
    }

    // Smoothing: Lower value = smoother/slower catch-up. 
    // 0.08 provides a nice weight without feeling sluggish.
    camera.position.lerp(camTarget, 0.08);

    const targetDir = lookTarget.clone().sub(camera.position).normalize();
    const currentLook = new THREE.Vector3();
    camera.getWorldDirection(currentLook);

    // Smooth look-at to avoid jitter
    camera.lookAt(camera.position.clone().add(currentLook.lerp(targetDir, 0.08)));

    if (state.clock.elapsedTime - lastStateSync.current > 0.05) {
      lastStateSync.current = state.clock.elapsedTime;
      onUpdate({ x: pPos.x, y: pPos.z }, internalVel.current);
    }
  });

  const currentPos = playerRef.current ? playerRef.current.position : new THREE.Vector3(initialPos.x, 0, initialPos.y);
  const renderDistFromCenter = Math.hypot(currentPos.x - worldSize / 2, currentPos.z - worldSize / 2);

  return (
    <>
      <group ref={playerRef}>
        <RealisticHumanoidBody
          velocity={internalVel.current}
          isWet={renderDistFromCenter > islandRadius}
          hideHead={mode === '1P'}
          walkTime={walkTime}
        />
      </group>

      {/* VFX: Partículas de Passos */}
      <FootstepParticles
        playerPosition={currentPos}
        velocity={internalVel.current}
        inWater={renderDistFromCenter > islandRadius}
      />
    </>
  );
};

const RealisticHumanoidBody: React.FC<{
  velocity: THREE.Vector2 | { length: () => number } | null | undefined,
  isWet: boolean,
  hideHead: boolean,
  walkTime: React.MutableRefObject<number>
}> = ({ velocity, isWet, hideHead, walkTime }) => {
  const hips = useRef<THREE.Group>(null);
  const chest = useRef<THREE.Group>(null);
  const headGroup = useRef<THREE.Group>(null);
  const lThigh = useRef<THREE.Group>(null);
  const lShin = useRef<THREE.Group>(null);
  const rThigh = useRef<THREE.Group>(null);
  const rShin = useRef<THREE.Group>(null);
  const lUpperArm = useRef<THREE.Group>(null);
  const lForearm = useRef<THREE.Group>(null);
  const rUpperArm = useRef<THREE.Group>(null);
  const rForearm = useRef<THREE.Group>(null);

  useFrame((state) => {
    // Create a safe default for velocity to prevent any access errors on undefined.
    const safeVelocity = velocity || { length: () => 0 };
    const speed = safeVelocity.length();

    const phase = walkTime.current;
    const time = state.clock.elapsedTime;

    // Animation blending and scales
    const isMoving = speed > 10;
    // Animation Tuning:
    // Swing: Increased multiplier (0.0055 -> 0.01) so animation is visible at lower speeds.
    const swing = Math.min(1.0, speed * 0.01);

    const lCycle = Math.sin(phase);
    const rCycle = Math.sin(phase + Math.PI);

    // 1. Legs: More organic step-through
    if (lThigh.current && lShin.current) {
      lThigh.current.rotation.x = lCycle * swing;
      // Shin bends more on backswing
      lShin.current.rotation.x = lCycle < 0 ? -Math.abs(lCycle) * 1.8 * swing : -0.1;
    }
    if (rThigh.current && rShin.current) {
      rThigh.current.rotation.x = rCycle * swing;
      rShin.current.rotation.x = rCycle < 0 ? -Math.abs(rCycle) * 1.8 * swing : -0.1;
    }

    // 2. Hips & Core (The foundation of natural movement)
    if (hips.current && chest.current) {
      // Idle Breathing
      const breath = Math.sin(time * 0.8) * 0.015;
      const breathShoulders = Math.sin(time * 1.2) * 0.01;

      // Base Y Position (Bobbing when moving, breathing when idle)
      const bob = Math.abs(Math.cos(phase)) * swing * 0.16;
      hips.current.position.y = 0.95 + (isMoving ? bob : breath);

      // Weight Shift (Lateral sway)
      const lateralSway = Math.sin(phase) * swing * 0.12;
      hips.current.position.x = isMoving ? lateralSway : 0;

      // Hip Roll & Twist
      hips.current.rotation.z = isMoving ? Math.sin(phase) * swing * 0.15 : 0;
      hips.current.rotation.y = isMoving ? Math.sin(phase + Math.PI / 2) * swing * 0.18 : 0;

      // 3. Chest: Counter-rotation and Leaning
      // Shoulders move opposite to hips for balance
      chest.current.rotation.y = isMoving ? -hips.current.rotation.y * 1.3 : 0;

      // Pitch/Lean forward when running
      const forwardLean = isMoving ? (speed / 350) * 0.5 : 0;
      chest.current.rotation.x = forwardLean + (isMoving ? Math.sin(time * 2) * 0.02 : breathShoulders);

      // Dynamic Bank/Lean (Centrifugal)
      const banking = isMoving ? (hips.current.rotation.z * 0.5) : 0;
      chest.current.rotation.z = -banking;
    }

    // 4. Arms: Fluid swing with shoulder movement
    if (lUpperArm.current && lForearm.current) {
      lUpperArm.current.rotation.x = rCycle * swing * 1.5;
      lUpperArm.current.rotation.z = isMoving ? -0.15 - (swing * 0.1) : -0.1;
      lForearm.current.rotation.x = Math.max(0.35, Math.abs(rCycle) * swing * 1.2);
    }
    if (rUpperArm.current && rForearm.current) {
      rUpperArm.current.rotation.x = lCycle * swing * 1.5;
      rUpperArm.current.rotation.z = isMoving ? 0.15 + (swing * 0.1) : 0.1;
      rForearm.current.rotation.x = Math.max(0.35, Math.abs(lCycle) * swing * 1.2);
    }

    // 5. Head: Stabilization
    if (headGroup.current) {
      // Head stays relatively level while body bobs
      const headCounterBob = isMoving ? -Math.sin(phase * 2) * swing * 0.12 : 0;
      headGroup.current.rotation.x = headCounterBob + Math.sin(time * 0.6) * 0.03;
    }
  });

  // Visual Upgrade: Survivalist Palette
  const skinColor = "#e0ac69"; // Warmer skin tone
  const clothColor = isWet ? "#2d3748" : "#4a5568"; // Slate Grey Shirt
  const pantsColor = isWet ? "#1a202c" : "#2f3542"; // Dark Blue/Grey Pants
  const gearColor = "#8d5524"; // Leather Brown
  const bootColor = "#1a202c"; // Dark Boots

  return (
    <group>
      <group ref={hips} position={[0, 0.95, 0]}>
        {/* Hips & Belt */}
        <mesh castShadow>
          <boxGeometry args={[0.38, 0.22, 0.20]} />{/* Slightly narrower hips */}
          <meshStandardMaterial color={pantsColor} roughness={0.9} />
        </mesh>
        {/* Utility Belt */}
        <group position={[0, 0.05, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.40, 0.08, 0.23]} />
            <meshStandardMaterial color={gearColor} roughness={0.6} />
          </mesh>
          <mesh position={[0.12, 0, 0.12]} castShadow>
            <boxGeometry args={[0.08, 0.1, 0.04]} />{/* Pouch */}
            <meshStandardMaterial color={gearColor} roughness={0.6} />
          </mesh>
          <mesh position={[-0.12, 0, 0.12]} castShadow>
            <boxGeometry args={[0.08, 0.1, 0.04]} />{/* Pouch */}
            <meshStandardMaterial color={gearColor} roughness={0.6} />
          </mesh>
        </group>

        <group ref={lThigh} position={[-0.18, -0.05, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.09, 0.45, 4, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.9} />
          </mesh>
          <group ref={lShin} position={[0, -0.44, 0]}>
            <mesh castShadow position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
              <meshStandardMaterial color={pantsColor} roughness={0.9} />
            </mesh>
            {/* Boot */}
            <mesh castShadow position={[0, -0.38, 0.03]}>
              <boxGeometry args={[0.12, 0.15, 0.22]} />
              <meshStandardMaterial color={bootColor} roughness={0.8} />
            </mesh>
          </group>
        </group>

        <group ref={rThigh} position={[0.18, -0.05, 0]}>
          <mesh castShadow position={[0, -0.22, 0]}>
            <capsuleGeometry args={[0.09, 0.45, 4, 8]} />
            <meshStandardMaterial color={pantsColor} roughness={0.9} />
          </mesh>
          <group ref={rShin} position={[0, -0.44, 0]}>
            <mesh castShadow position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.08, 0.35, 4, 8]} />
              <meshStandardMaterial color={pantsColor} roughness={0.9} />
            </mesh>
            {/* Boot */}
            <mesh castShadow position={[0, -0.38, 0.03]}>
              <boxGeometry args={[0.12, 0.15, 0.22]} />
              <meshStandardMaterial color={bootColor} roughness={0.8} />
            </mesh>
          </group>
        </group>

        <group ref={chest} position={[0, 0.3, 0]}>
          {/* Torso */}
          <mesh castShadow position={[0, 0.25, 0]}>
            <boxGeometry args={[0.48, 0.55, 0.26]} />
            <meshStandardMaterial color={clothColor} roughness={0.9} />
          </mesh>

          {/* Backpack */}
          <group position={[0, 0.3, -0.2]}>
            <mesh castShadow>
              <boxGeometry args={[0.35, 0.45, 0.15]} />
              <meshStandardMaterial color="#3e3935" roughness={1.0} />
            </mesh>
            {/* Bedroll on top */}
            <mesh position={[0, 0.25, 0]} rotation={[0, 0, 1.57]}>
              <capsuleGeometry args={[0.08, 0.36, 4, 8]} />
              <meshStandardMaterial color="#5d6d7e" roughness={0.9} />
            </mesh>
          </group>

          <group position={[0, 0.55, 0]}>
            <mesh castShadow position={[0, 0.05, 0]}>
              <cylinderGeometry args={[0.07, 0.09, 0.12, 8]} />
              <meshStandardMaterial color={skinColor} roughness={0.8} />
            </mesh>
            <group ref={headGroup} position={[0, 0.24, 0]} visible={!hideHead}>
              <mesh castShadow>
                <boxGeometry args={[0.26, 0.3, 0.28]} />
                <meshStandardMaterial color={skinColor} roughness={0.8} />
              </mesh>
              {/* Hair / Cap Base */}
              <mesh position={[0, 0.16, 0]}>
                <boxGeometry args={[0.28, 0.08, 0.3]} />
                <meshStandardMaterial color="#2c1e14" roughness={1} />
              </mesh>

              {/* Face Details */}
              <group position={[0, 0, 0.145]}>
                {/* Eyes */}
                <group position={[0, 0.04, 0]}>
                  <mesh position={[-0.07, 0, 0]}><boxGeometry args={[0.05, 0.02, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
                  <mesh position={[0.07, 0, 0]}><boxGeometry args={[0.05, 0.02, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
                </group>

                {/* Bandana */}
                <mesh position={[0, -0.08, 0.01]}>
                  <boxGeometry args={[0.27, 0.14, 0.02]} />
                  <meshStandardMaterial color={gearColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, -0.08, -0.01]} rotation={[-0.2, 0, 0]}>
                  <boxGeometry args={[0.22, 0.14, 0.1]} /> {/* Bandana bulk */}
                  <meshStandardMaterial color={gearColor} roughness={0.9} />
                </mesh>
              </group>
            </group>
          </group>

          <group ref={lUpperArm} position={[-0.34, 0.45, 0]}>
            <mesh castShadow position={[0, -0.18, 0]}>
              <capsuleGeometry args={[0.07, 0.38, 4, 8]} />
              <meshStandardMaterial color={clothColor} roughness={0.9} />
            </mesh>
            <group ref={lForearm} position={[0, -0.38, 0]}>
              <mesh castShadow position={[0, -0.15, 0]}>
                <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
                <meshStandardMaterial color={skinColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.32, 0]}>
                <sphereGeometry args={[0.06, 6, 6]} />
                <meshStandardMaterial color={skinColor} />
              </mesh>
            </group>
          </group>

          <group ref={rUpperArm} position={[0.34, 0.45, 0]}>
            <mesh castShadow position={[0, -0.18, 0]}>
              <capsuleGeometry args={[0.07, 0.38, 4, 8]} />
              <meshStandardMaterial color={clothColor} roughness={0.9} />
            </mesh>
            <group ref={rForearm} position={[0, -0.38, 0]}>
              <mesh castShadow position={[0, -0.15, 0]}>
                <capsuleGeometry args={[0.06, 0.3, 4, 8]} />
                <meshStandardMaterial color={skinColor} roughness={0.8} />
              </mesh>
              <mesh position={[0, -0.32, 0]}>
                <sphereGeometry args={[0.06, 6, 6]} />
                <meshStandardMaterial color={skinColor} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const ForestElement: React.FC<{ entity: Entity }> = React.memo(({ entity }) => {
  if (!entity) return null;
  const pos = [entity.pos.x, 0, entity.pos.y] as [number, number, number];
  const scale = entity.size || 1;
  const rot = entity.rotation || 0;

  switch (entity.type) {
    case ResourceType.WOOD:
      return (
        <group position={pos} rotation={[0, rot, 0]} scale={scale}>
          <mesh castShadow position={[0, 1, 0]}><cylinderGeometry args={[0.2, 0.3, 2, 8]} /><meshStandardMaterial color="#5d4037" /></mesh>
          <mesh castShadow position={[0, 2.5, 0]}><coneGeometry args={[1.5, 3.5, 8]} /><meshStandardMaterial color="#166534" /></mesh>
        </group>
      );
    case ResourceType.STONE:
      return (
        <mesh castShadow position={[entity.pos.x, 0.3 * scale, entity.pos.y]} scale={scale} rotation={[rot, rot, rot]}>
          <dodecahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>
      );
    case ResourceType.FOOD:
      return (
        <mesh castShadow position={[entity.pos.x, 0.4, entity.pos.y]} scale={scale}>
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial color="#e11d48" />
        </mesh>
      );
    default:
      return (
        <group position={pos} rotation={[0, rot, 0]} scale={scale * 0.8}>
          <mesh castShadow position={[0, 0.5, 0]}><sphereGeometry args={[0.6, 6, 6]} /><meshStandardMaterial color="#166534" flatShading /></mesh>
        </group>
      );
  }
});

export const GameCanvas: React.FC<GameWorldProps> = ({
  playerPosition,
  entities,
  worldSize,
  islandRadius,
  onUpdatePosition,
  onFootstep,
  keysPressed,
  cameraMode,
  velocity
}) => {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#bae6fd]">
      <Canvas shadows gl={{ antialias: true, stencil: false }} dpr={[1, 1.5]}>
        <PerspectiveCamera makeDefault fov={45} position={[0, 50, 50]} />

        <MasterController
          worldSize={worldSize}
          islandRadius={islandRadius}
          entities={entities}
          onUpdate={onUpdatePosition}
          onFootstep={onFootstep}
          keys={keysPressed}
          mode={cameraMode}
          initialPos={playerPosition}
        />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[120, 150, 80]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />

        <Sky sunPosition={[100, 20, 100]} turbidity={0.1} />
        <fog attach="fog" args={['#bae6fd', 45, 250]} />

        <group position={[worldSize / 2, 0, worldSize / 2]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[islandRadius, 64]} />
            <meshStandardMaterial color="#14532d" roughness={1} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
            <planeGeometry args={[worldSize, worldSize]} />
            <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} metalness={0.4} roughness={0.1} />
          </mesh>
        </group>

        {entities && Array.isArray(entities) && entities.map(ent => (ent ? <ForestElement key={ent.id} entity={ent} /> : null))}

        <ContactShadows
          position={[worldSize / 2, 0.01, worldSize / 2]}
          opacity={0.4}
          scale={islandRadius * 2.2}
          blur={2.5}
          far={10}
        />

        {/* Efeitos de Pós-Processamento desativados para evitar crash */}
        {/* <EffectComposer enableNormalPass={false}>
          <Bloom 
            intensity={0.5} 
            luminanceThreshold={0.9} 
            luminanceSmoothing={0.025} 
            mipmapBlur 
          />
          <ChromaticAberration 
            offset={new THREE.Vector2(0.001, 0.001)} 
          />
          <Vignette 
            offset={0.5} 
            darkness={0.5} 
          />
        </EffectComposer> */}
      </Canvas>
    </div>
  );
};
