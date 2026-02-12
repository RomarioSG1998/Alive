
import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Vector2, Entity, ResourceType } from '../types';
import { CameraMode } from '../App';
import { FootstepParticles } from './VFX';

// ... (Define Axe Component)
const Axe: React.FC = () => (
  <group rotation={[1.5, 0, 0]} position={[0, 0.35, 0.05]}>
    {/* Handle */}
    <mesh castShadow position={[0, -0.2, 0]}>
      <cylinderGeometry args={[0.02, 0.025, 0.6, 8]} />
      <meshStandardMaterial color="#5D4037" roughness={0.9} />
    </mesh>
    {/* Head */}
    <group position={[0, 0, 0]}>
      <mesh castShadow>
        <boxGeometry args={[0.15, 0.1, 0.03]} /> {/* Wedge block */}
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.8} />
      </mesh>
      <mesh castShadow position={[0.08, 0, 0]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.06, 0.12, 0.01]} /> {/* Blade edge */}
        <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.9} />
      </mesh>
    </group>
  </group>
);


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
  lastAttack?: number; // Added
  lastHit?: { id: string; time: number } | null;
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
  lastAttack?: number; // Added
}> = ({ worldSize, islandRadius, entities, onUpdate, onFootstep, keys, mode, initialPos, lastAttack }) => {
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
          lastAttack={lastAttack} // Pass to body
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
  walkTime: React.MutableRefObject<number>,
  lastAttack?: number // Added
}> = ({ velocity, isWet, hideHead, walkTime, lastAttack }) => {
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
    // Swing: Reduced multiplier (0.01 -> 0.007) to settle "crazy legs"
    const swing = Math.min(1.0, speed * 0.007);

    const lCycle = Math.sin(phase);
    const rCycle = Math.sin(phase + Math.PI);

    // Smoothing helper
    const lerp = THREE.MathUtils.lerp;
    const alpha = 0.2; // Higher = Snappier, Lower = Smoother

    // 1. Legs: Weighted, interpolated movement
    if (lThigh.current && lShin.current) {
      const tRot = lCycle * swing;
      lThigh.current.rotation.x = lerp(lThigh.current.rotation.x, tRot, alpha);

      const sRot = lCycle < 0 ? -Math.abs(lCycle) * 1.5 * swing : -0.1;
      lShin.current.rotation.x = lerp(lShin.current.rotation.x, sRot, alpha);
    }
    if (rThigh.current && rShin.current) {
      const tRot = rCycle * swing;
      rThigh.current.rotation.x = lerp(rThigh.current.rotation.x, tRot, alpha);

      const sRot = rCycle < 0 ? -Math.abs(rCycle) * 1.5 * swing : -0.1;
      rShin.current.rotation.x = lerp(rShin.current.rotation.x, sRot, alpha);
    }

    // 2. Hips & Core
    if (hips.current && chest.current) {
      const breath = Math.sin(time * 0.8) * 0.015;
      const breathShoulders = Math.sin(time * 1.2) * 0.01;

      const bob = Math.abs(Math.cos(phase)) * swing * 0.16;
      hips.current.position.y = lerp(hips.current.position.y, 0.95 + (isMoving ? bob : breath), alpha);

      const sway = Math.sin(phase) * swing * 0.12;
      hips.current.position.x = lerp(hips.current.position.x, isMoving ? sway : 0, alpha);

      hips.current.rotation.z = lerp(hips.current.rotation.z, isMoving ? Math.sin(phase) * swing * 0.15 : 0, alpha);
      hips.current.rotation.y = lerp(hips.current.rotation.y, isMoving ? Math.sin(phase + Math.PI / 2) * swing * 0.18 : 0, alpha);

      // 3. Chest
      chest.current.rotation.y = lerp(chest.current.rotation.y, isMoving ? -hips.current.rotation.y * 1.3 : 0, alpha);

      const forwardLean = isMoving ? (speed / 350) * 0.5 : 0;
      const targetLean = forwardLean + (isMoving ? Math.sin(time * 2) * 0.02 : breathShoulders);
      chest.current.rotation.x = lerp(chest.current.rotation.x, targetLean, alpha);

      const banking = isMoving ? (hips.current.rotation.z * 0.5) : 0;
      chest.current.rotation.z = lerp(chest.current.rotation.z, -banking, alpha);
    }

    // ATTACK ANIMATION OVERRIDE
    const timeSinceAttack = Date.now() - (lastAttack || 0);
    const isAttacking = timeSinceAttack < 400; // 400ms attack animation

    // 4. Arms: Fluid swing
    if (lUpperArm.current && lForearm.current) {
      lUpperArm.current.rotation.x = lerp(lUpperArm.current.rotation.x, rCycle * swing * 1.5, alpha);
      lUpperArm.current.rotation.z = lerp(lUpperArm.current.rotation.z, isMoving ? -0.15 - (swing * 0.1) : -0.1, alpha);
      lForearm.current.rotation.x = lerp(lForearm.current.rotation.x, Math.max(0.35, Math.abs(rCycle) * swing * 1.2), alpha);
    }

    if (rUpperArm.current && rForearm.current) {
      if (isAttacking) {
        // Chopping motion
        // t goes from 0 to 1 over 400ms
        const t = timeSinceAttack / 400;
        // Raise, Swing, Recover
        // Simple curve: 
        // 0-0.3: Raise back
        // 0.3-0.6: Slam forward
        // 0.6-1.0: Recover

        let tx = 0, tz = 0;
        let fx = 0;

        if (t < 0.3) {
          // BACK
          const p = t / 0.3;
          tx = -Math.PI / 2 - (p * 0.5); // Raise up
          fx = 1.5; // Bend elbow
        } else if (t < 0.6) {
          // SWING
          const p = (t - 0.3) / 0.3;
          // Linear slam? easing?
          tx = (-Math.PI / 2 - 0.5) + (p * 2.5); // Slam down
          fx = 1.5 - (p * 1.2); // Straighten arm
        } else {
          // RECOVER
          const p = (t - 0.6) / 0.4;
          tx = (-Math.PI / 2 - 0.5 + 2.5) - (p * 2.0); // Recover to neutral-ish
          fx = 0.3 + (p * 0.1);
        }

        // Fast lerp for snap
        const fastAlpha = 0.4;
        rUpperArm.current.rotation.x = lerp(rUpperArm.current.rotation.x, tx, fastAlpha);
        rUpperArm.current.rotation.z = lerp(rUpperArm.current.rotation.z, 0.4, fastAlpha); // Angle out slightly
        rForearm.current.rotation.x = lerp(rForearm.current.rotation.x, fx, fastAlpha);

      } else {
        // Normal Walk/Idle
        rUpperArm.current.rotation.x = lerp(rUpperArm.current.rotation.x, lCycle * swing * 1.5, alpha);
        rUpperArm.current.rotation.z = lerp(rUpperArm.current.rotation.z, isMoving ? 0.15 + (swing * 0.1) : 0.1, alpha);
        rForearm.current.rotation.x = lerp(rForearm.current.rotation.x, Math.max(0.35, Math.abs(lCycle) * swing * 1.2), alpha);
      }
    }

    // 5. Head: Stabilization
    if (headGroup.current) {
      const headCounterBob = isMoving ? -Math.sin(phase * 2) * swing * 0.12 : 0;
      headGroup.current.rotation.x = lerp(headGroup.current.rotation.x, headCounterBob + Math.sin(time * 0.6) * 0.03, alpha);
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

        {/* Stomach / Spine Connection (Fix Gap) */}
        <mesh position={[0, 0.18, 0]} castShadow>
          <boxGeometry args={[0.34, 0.25, 0.18]} />
          <meshStandardMaterial color={clothColor} roughness={0.9} />
        </mesh>

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

              {/* AXE ATTACHMENT */}
              <Axe />
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

  // Tree Variation
  const isPine = entity.type === ResourceType.WOOD;
  const foliageColor = isPine ? (Math.random() > 0.5 ? "#166534" : "#15803d") : "#166534";

  switch (entity.type) {
    case ResourceType.WOOD: {
      // Deterministic tree type based on position
      const pseudoRandom = Math.abs(Math.sin(entity.pos.x * 12.9898 + entity.pos.y * 78.233) * 43758.5453) % 1;

      // 50% Pine, 25% Oak, 25% Birch
      if (pseudoRandom < 0.5) {
        // PINE TREE (Existing)
        return (
          <group position={pos} rotation={[0, rot, 0]} scale={scale}>
            {/* Trunk */}
            <mesh castShadow position={[0, 0.8, 0]}>
              <cylinderGeometry args={[0.2, 0.35, 1.6, 8]} />
              <meshStandardMaterial color="#3e2723" roughness={1} side={THREE.DoubleSide} />
            </mesh>
            {/* Foliage Layers (Pine Style) */}
            <mesh castShadow position={[0, 1.8, 0]}>
              <coneGeometry args={[1.8, 1.5, 8]} />
              <meshStandardMaterial color={foliageColor} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh castShadow position={[0, 2.8, 0]}>
              <coneGeometry args={[1.4, 1.5, 8]} />
              <meshStandardMaterial color={foliageColor} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh castShadow position={[0, 3.8, 0]}>
              <coneGeometry args={[1.0, 1.2, 8]} />
              <meshStandardMaterial color={foliageColor} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      } else if (pseudoRandom < 0.75) {
        // OAK TREE (New) - Round foliage
        const oakFoliageColor = Math.random() > 0.5 ? "#15803d" : "#166534"; // Darker green
        return (
          <group position={pos} rotation={[0, rot, 0]} scale={scale}>
            {/* Trunk */}
            <mesh castShadow position={[0, 0.7, 0]}>
              <cylinderGeometry args={[0.25, 0.35, 1.4, 8]} />
              <meshStandardMaterial color="#5D4037" roughness={1} side={THREE.DoubleSide} /> {/* Darker brown */}
            </mesh>
            {/* Main Foliage Clump */}
            <mesh castShadow position={[0, 2.2, 0]}>
              <dodecahedronGeometry args={[1.5, 0]} />
              <meshStandardMaterial color={oakFoliageColor} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
            {/* Side clumps for volume */}
            <mesh castShadow position={[0.8, 1.8, 0]}>
              <dodecahedronGeometry args={[1.0, 0]} />
              <meshStandardMaterial color={oakFoliageColor} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
            <mesh castShadow position={[-0.7, 1.9, 0.5]}>
              <dodecahedronGeometry args={[0.9, 0]} />
              <meshStandardMaterial color={oakFoliageColor} roughness={0.9} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      } else {
        // BIRCH TREE (New) - Tall, thin, white trunk
        return (
          <group position={pos} rotation={[0, rot, 0]} scale={scale}>
            {/* Trunk - White with spots */}
            <mesh castShadow position={[0, 1.5, 0]}>
              <cylinderGeometry args={[0.12, 0.18, 3.0, 8]} />
              <meshStandardMaterial color="#eef2ff" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            {/* Black spots (simple rings/bands for optimization instead of texture for now) */}
            <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0.1]}>
              <torusGeometry args={[0.16, 0.02, 4, 8]} />
              <meshStandardMaterial color="#1f2937" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 1.2, 0]} rotation={[0, 0, -0.1]}>
              <torusGeometry args={[0.14, 0.02, 4, 8]} />
              <meshStandardMaterial color="#1f2937" side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 2.0, 0]} rotation={[0, 0, 0.05]}>
              <torusGeometry args={[0.13, 0.02, 4, 8]} />
              <meshStandardMaterial color="#1f2937" side={THREE.DoubleSide} />
            </mesh>

            {/* Foliage - Sparse, higher up */}
            <mesh castShadow position={[0, 3.2, 0]}>
              <dodecahedronGeometry args={[1.2, 0]} />
              <meshStandardMaterial color="#4d7c0f" roughness={0.8} side={THREE.DoubleSide} /> {/* Lighter/Yellowish Green */}
            </mesh>
            <mesh castShadow position={[0.5, 2.8, 0]}>
              <dodecahedronGeometry args={[0.8, 0]} />
              <meshStandardMaterial color="#4d7c0f" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      }
    }
    case ResourceType.STONE:
      return (
        <mesh castShadow position={[entity.pos.x, 0.3 * scale, entity.pos.y]} scale={scale} rotation={[rot, rot, rot]}>
          <dodecahedronGeometry args={[0.7, 0]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} />
        </mesh>
      );
    case ResourceType.FOOD:
      return (
        <group position={[entity.pos.x, 0, entity.pos.y]} scale={scale}>
          <mesh castShadow position={[0, 0.4, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshStandardMaterial color="#e11d48" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.4]} />
            <meshStandardMaterial color="#166534" />
          </mesh>
        </group>
      );
    default:
      return (
        <group position={pos} rotation={[0, rot, 0]} scale={scale * 0.8}>
          <mesh castShadow position={[0, 0.5, 0]}><sphereGeometry args={[0.6, 6, 6]} /><meshStandardMaterial color="#166534" flatShading side={THREE.DoubleSide} /></mesh>
        </group>
      );
  }
});

const GrassField: React.FC<{ islandRadius: number; worldSize: number }> = ({ islandRadius, worldSize }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 8000;
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      // Random position within island
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * (islandRadius - 10); // Stay within island
      const x = (worldSize / 2) + Math.cos(angle) * radius;
      const z = (worldSize / 2) + Math.sin(angle) * radius;

      // Avoid center (spawn area)
      const distFromCenter = Math.hypot(x - worldSize / 2, z - worldSize / 2);
      if (distFromCenter < 15) {
        i--;
        continue;
      }

      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI;
      // Scale variation
      const s = 0.5 + Math.random() * 0.5;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      // Vary color slightly (requires custom shader or altering instance color attribute, 
      // sticking to simple material for now to avoid crash)
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [islandRadius, worldSize, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <coneGeometry args={[0.05, 0.4, 3]} />
      <meshStandardMaterial color="#4ade80" transparent opacity={0.8} />
    </instancedMesh>
  );
};

const ShakeGroup: React.FC<{ entity: Entity; lastHit?: { id: string; time: number } | null; children: React.ReactNode }> = ({ entity, lastHit, children }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (lastHit && lastHit.id === entity.id) {
      const timeSinceHit = Date.now() - lastHit.time;
      if (timeSinceHit < 250) {
        const intensity = 0.1 * (1 - timeSinceHit / 250);
        if (groupRef.current) {
          groupRef.current.rotation.z = Math.sin(timeSinceHit * 0.1) * intensity;
          groupRef.current.rotation.x = Math.cos(timeSinceHit * 0.1) * intensity;
        }
      } else {
        if (groupRef.current) {
          groupRef.current.rotation.z = 0;
          groupRef.current.rotation.x = 0;
        }
      }
    }
  });
  return <group ref={groupRef}>{children}</group>;
};

export const GameCanvas: React.FC<GameWorldProps> = ({
  playerPosition,
  entities,
  worldSize,
  islandRadius,
  onUpdatePosition,
  onFootstep,
  keysPressed,
  cameraMode,
  velocity,
  lastAttack,
  lastHit
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
          lastAttack={lastAttack} // Pass it down
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

        {/* Instanced Grass */}
        <GrassField islandRadius={islandRadius} worldSize={worldSize} />

        {entities && Array.isArray(entities) && entities.map(ent => (
          ent ? (
            <ShakeGroup key={ent.id} entity={ent} lastHit={lastHit}>
              <ForestElement entity={ent} />
            </ShakeGroup>
          ) : null
        ))}

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
