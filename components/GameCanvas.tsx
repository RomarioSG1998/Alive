
import React from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sky, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { AimState, Vector2, WeatherType, WorldPosition } from '../types';
import { PlayerController } from './player/PlayerController';
import { ForestElement } from './world/ForestElement';
import { GrassField } from './world/GrassField';
import { FlowerField } from './world/FlowerField';
import { LakeLife } from './world/LakeLife';
import { PetCompanions } from './world/PetCompanions';
import { ShakeGroup } from './effects/ShakeGroup';
import { Terrain } from './world/Terrain';
import { Cabin } from './world/Cabin';
import { useGameStore } from '../store/gameStore';
import { getTerrainHeight } from '../utils/terrainUtils';
import { audioService } from '../services/audioService';

interface ArrowShotFx {
  id: string;
  origin: { x: number; y: number; z: number };
  dir: { x: number; y: number; z: number };
  speed: number;
  bornAt: number;
  hitDistance: number;
}

interface GameWorldProps {
  playerPosition: Vector2;
  worldSize: number;
  islandRadius: number;
  velocity: THREE.Vector2;
  weather: WeatherType;
  timeMode: 'auto' | 'day' | 'night';
  realMinutes: number;
  isSitting: boolean;
  isObserving: boolean;
  isRifleAiming: boolean;
  binocularZoom: number;
  seatPosition: WorldPosition;
  seatYaw: number;
  observatoryPosition: WorldPosition;
  observatoryYaw: number;
  computerOn: boolean;
  computerScreenUrl: string;
  arrowShots: ArrowShotFx[];
  onUpdatePosition: (pos: Vector2, vel: THREE.Vector2) => void;
  onAimUpdate?: (aim: AimState) => void;
  onFootstep?: (isWet: boolean) => void;
  keysPressed: React.MutableRefObject<{ [key: string]: boolean }>;
}

const CartoonClouds: React.FC<{ center: number; count: number; opacityMult: number; speedMult: number }> = ({ center, count, opacityMult, speedMult }) => {
  const groupRef = React.useRef<THREE.Group>(null);

  const clusters = React.useMemo(() => ([
    { x: center - 420, y: 148, z: center - 360, s: 18, drift: 14, phase: 0.1 },
    { x: center - 260, y: 154, z: center - 340, s: 19, drift: 12, phase: 0.7 },
    { x: center - 80, y: 162, z: center - 330, s: 20, drift: 11, phase: 1.1 },
    { x: center + 100, y: 168, z: center - 320, s: 21, drift: 11, phase: 1.6 },
    { x: center + 290, y: 160, z: center - 300, s: 22, drift: 10, phase: 2.0 },
    { x: center + 430, y: 152, z: center - 280, s: 19, drift: 12, phase: 2.4 },

    { x: center - 440, y: 156, z: center - 90, s: 20, drift: 13, phase: 2.9 },
    { x: center - 260, y: 164, z: center - 80, s: 22, drift: 12, phase: 3.2 },
    { x: center - 40, y: 176, z: center - 70, s: 27, drift: 10, phase: 3.8 },
    { x: center + 190, y: 170, z: center - 90, s: 23, drift: 11, phase: 4.2 },
    { x: center + 420, y: 158, z: center - 100, s: 20, drift: 12, phase: 4.7 },

    { x: center - 430, y: 154, z: center + 150, s: 19, drift: 12, phase: 5.1 },
    { x: center - 250, y: 162, z: center + 170, s: 20, drift: 11, phase: 5.6 },
    { x: center - 30, y: 174, z: center + 160, s: 25, drift: 10, phase: 6.0 },
    { x: center + 180, y: 168, z: center + 170, s: 22, drift: 11, phase: 6.5 },
    { x: center + 390, y: 158, z: center + 180, s: 21, drift: 12, phase: 7.0 },

    { x: center - 360, y: 150, z: center + 360, s: 18, drift: 13, phase: 7.4 },
    { x: center - 160, y: 158, z: center + 350, s: 19, drift: 12, phase: 7.8 },
    { x: center + 40, y: 164, z: center + 340, s: 20, drift: 11, phase: 8.2 },
    { x: center + 260, y: 156, z: center + 330, s: 19, drift: 12, phase: 8.7 },
    { x: center + 430, y: 148, z: center + 320, s: 18, drift: 13, phase: 9.1 },
  ]), [center]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      const c = clusters[i];
      child.position.x = c.x + Math.sin(t * 0.045 * speedMult + c.phase) * c.drift;
      child.position.z = c.z + Math.cos(t * 0.035 * speedMult + c.phase) * c.drift * 0.7;
      child.position.y = c.y + Math.sin(t * 0.12 + c.phase) * 0.8;
    });
  });

  return (
    <group ref={groupRef}>
      {clusters.slice(0, count).map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]}>
          <mesh castShadow position={[-c.s * 0.48, 0, 0]} scale={[1.2, 0.85, 1]}>
            <sphereGeometry args={[c.s * 0.5, 14, 12]} />
            <meshStandardMaterial color="#f8fafc" transparent opacity={0.95 * opacityMult} roughness={0.95} metalness={0} />
          </mesh>
          <mesh castShadow position={[0, c.s * 0.12, 0]} scale={[1.35, 0.95, 1]}>
            <sphereGeometry args={[c.s * 0.58, 14, 12]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={opacityMult} roughness={0.95} metalness={0} />
          </mesh>
          <mesh castShadow position={[c.s * 0.52, 0, 0]} scale={[1.18, 0.8, 1]}>
            <sphereGeometry args={[c.s * 0.48, 14, 12]} />
            <meshStandardMaterial color="#f1f5f9" transparent opacity={0.95 * opacityMult} roughness={0.95} metalness={0} />
          </mesh>
          <mesh position={[0, -c.s * 0.2, 0]} scale={[2.4, 0.32, 1.3]}>
            <sphereGeometry args={[c.s * 0.36, 12, 10]} />
            <meshStandardMaterial color="#cbd5e1" transparent opacity={0.22 * opacityMult} roughness={1} metalness={0} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const StarField: React.FC<{ center: number; intensity: number }> = ({ center, intensity }) => {
  const pointsRef = React.useRef<THREE.Points>(null);
  const starData = React.useMemo(() => {
    const count = 1400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const radius = 1200;
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(THREE.MathUtils.randFloat(0.03, 1));
      const r = radius + Math.random() * 260;
      const x = center + r * Math.sin(phi) * Math.cos(theta);
      const y = 180 + r * Math.cos(phi);
      const z = center + r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      const hue = 0.55 + Math.random() * 0.1;
      const sat = 0.1 + Math.random() * 0.2;
      const light = 0.75 + Math.random() * 0.25;
      const c = new THREE.Color().setHSL(hue, sat, light);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, colors };
  }, [center]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.material.opacity = THREE.MathUtils.lerp(
      pointsRef.current.material.opacity,
      THREE.MathUtils.clamp(intensity, 0, 1) * 0.9,
      0.08
    );
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.004;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={starData.positions.length / 3} array={starData.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={starData.colors.length / 3} array={starData.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={1.25} vertexColors transparent opacity={0} sizeAttenuation depthWrite={false} />
    </points>
  );
};

const RainField: React.FC<{ center: number; worldSize: number; intensity: number }> = ({ center, worldSize, intensity }) => {
  const pointsRef = React.useRef<THREE.Points>(null);
  const count = Math.floor(3200 * intensity);
  const rainData = React.useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const spread = Math.max(760, worldSize * 0.36);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = center + (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = 40 + Math.random() * 130;
      positions[i * 3 + 2] = center + (Math.random() - 0.5) * spread;
      speeds[i] = 68 + Math.random() * (58 + intensity * 40);
    }
    return { positions, speeds, spread };
  }, [count, center, worldSize]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const arr = (pointsRef.current.geometry.attributes.position.array as Float32Array);
    const wind = Math.sin(state.clock.elapsedTime * 0.35) * (0.12 + intensity * 0.2);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= rainData.speeds[i] * delta;
      arr[i * 3] += rainData.speeds[i] * delta * wind * 0.08;
      arr[i * 3 + 2] += rainData.speeds[i] * delta * 0.012;
      if (arr[i * 3 + 1] < -2) {
        arr[i * 3] = center + (Math.random() - 0.5) * rainData.spread;
        arr[i * 3 + 1] = 70 + Math.random() * 100;
        arr[i * 3 + 2] = center + (Math.random() - 0.5) * rainData.spread;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={rainData.positions.length / 3} array={rainData.positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#cfe8ff" size={0.9} transparent opacity={0.56} sizeAttenuation />
    </points>
  );
};

const StormFlash: React.FC<{ center: number; enabled: boolean }> = ({ center, enabled }) => {
  const lightRef = React.useRef<THREE.PointLight>(null);
  const boltRef = React.useRef<THREE.Group>(null);
  const boltMatRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const timerRef = React.useRef(0.8);
  const burstRef = React.useRef(0);
  const boltLifeRef = React.useRef(0);
  useFrame((state, delta) => {
    if (!lightRef.current) return;
    if (!enabled) {
      lightRef.current.intensity = 0;
      if (boltRef.current) boltRef.current.visible = false;
      return;
    }

    timerRef.current -= delta;

    const triggerFlash = () => {
      const lx = center + (Math.random() - 0.5) * 620;
      const lz = center + (Math.random() - 0.5) * 620;
      lightRef.current!.position.set(lx, 130 + Math.random() * 30, lz);
      lightRef.current!.intensity = 5 + Math.random() * 4.5;
      if (boltRef.current) {
        boltRef.current.visible = true;
        boltRef.current.position.set(lx, 70, lz);
        boltRef.current.rotation.y = Math.random() * Math.PI * 2;
      }
      boltLifeRef.current = 0.18 + Math.random() * 0.1;
      const thunderDelay = 120 + Math.random() * 700;
      window.setTimeout(() => {
        audioService.playThunder(0.8 + Math.random() * 0.6);
      }, thunderDelay);
    };

    if (timerRef.current <= 0 || burstRef.current > 0) {
      triggerFlash();
      if (burstRef.current > 0) {
        burstRef.current -= 1;
        timerRef.current = 0.08 + Math.random() * 0.16;
      } else {
        burstRef.current = Math.random() > 0.55 ? 1 + Math.floor(Math.random() * 2) : 0;
        timerRef.current = 1.4 + Math.random() * 3.2;
      }
    } else {
      lightRef.current.intensity = Math.max(0, lightRef.current.intensity - delta * 13);
    }

    if (boltLifeRef.current > 0) {
      boltLifeRef.current -= delta;
      if (boltMatRef.current) {
        boltMatRef.current.opacity = Math.max(0, boltLifeRef.current / 0.22) * (0.78 + Math.sin(state.clock.elapsedTime * 65) * 0.15);
      }
    } else if (boltRef.current) {
      boltRef.current.visible = false;
    }
  });
  return (
    <>
      <pointLight ref={lightRef} position={[center + 40, 120, center - 30]} color="#eef7ff" intensity={0} distance={1500} decay={2} />
      <group ref={boltRef} visible={false}>
        <mesh position={[0, 40, 0]} rotation={[0.08, 0.2, 0.05]}>
          <cylinderGeometry args={[0.18, 0.3, 80, 6]} />
          <meshBasicMaterial ref={boltMatRef} color="#f4fbff" transparent opacity={0} />
        </mesh>
        <mesh position={[6, 23, 2]} rotation={[0.05, -0.25, 0.18]}>
          <cylinderGeometry args={[0.08, 0.14, 36, 6]} />
          <meshBasicMaterial color="#dff1ff" transparent opacity={0.75} />
        </mesh>
        <mesh position={[-5, 18, -1]} rotation={[-0.03, 0.2, -0.16]}>
          <cylinderGeometry args={[0.07, 0.12, 32, 6]} />
          <meshBasicMaterial color="#dff1ff" transparent opacity={0.72} />
        </mesh>
      </group>
    </>
  );
};

const ArrowProjectile: React.FC<{ shot: ArrowShotFx }> = ({ shot }) => {
  const groupRef = React.useRef<THREE.Group>(null);
  const trailMatRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const tipMatRef = React.useRef<THREE.MeshStandardMaterial>(null);

  const dir = React.useMemo(() => new THREE.Vector3(shot.dir.x, shot.dir.y, shot.dir.z).normalize(), [shot.dir.x, shot.dir.y, shot.dir.z]);
  const quat = React.useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir), [dir]);

  useFrame(() => {
    if (!groupRef.current) return;
    const life = (Date.now() - shot.bornAt) / 1000;
    if (life > 1.8) {
      groupRef.current.visible = false;
      return;
    }

    const dist = Math.min(shot.hitDistance, life * shot.speed);
    const px = shot.origin.x + dir.x * dist;
    const py = shot.origin.y + dir.y * dist;
    const pz = shot.origin.z + dir.z * dist;
    groupRef.current.visible = true;
    groupRef.current.position.set(px, py, pz);
    groupRef.current.quaternion.copy(quat);

    const fade = Math.max(0, 1 - life / 1.8);
    if (trailMatRef.current) trailMatRef.current.opacity = 0.75 * fade;
    if (tipMatRef.current) tipMatRef.current.emissiveIntensity = 0.5 + fade * 1.5;
  });

  return (
    <group ref={groupRef} position={[shot.origin.x, shot.origin.y, shot.origin.z]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.05]}>
        <cylinderGeometry args={[0.017, 0.017, 0.9, 8]} />
        <meshStandardMaterial color="#6b4226" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.5]}>
        <coneGeometry args={[0.032, 0.16, 10]} />
        <meshStandardMaterial ref={tipMatRef} color="#9ca3af" emissive="#fef3c7" emissiveIntensity={1.2} roughness={0.35} metalness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -1]}>
        <cylinderGeometry args={[0.05, 0.003, 2.2, 8, 1, true]} />
        <meshBasicMaterial ref={trailMatRef} color="#ffd089" transparent opacity={0.72} />
      </mesh>
    </group>
  );
};

export const GameCanvas: React.FC<GameWorldProps> = ({
  playerPosition,
  worldSize,
  islandRadius,
  onUpdatePosition,
  onFootstep,
  keysPressed,
  velocity,
  weather,
  timeMode,
  realMinutes,
  isSitting,
  isObserving,
  isRifleAiming,
  binocularZoom,
  seatPosition,
  seatYaw,
  observatoryPosition,
  observatoryYaw,
  computerOn,
  computerScreenUrl,
  arrowShots,
  onAimUpdate
}) => {
  const { entities, cameraMode, lastAttack, lastHit } = useGameStore();
  const center = worldSize / 2;
  const dayPhase = React.useMemo(() => {
    // 0 at midnight, 1 around noon (continuous by minute).
    const h = realMinutes / 60;
    const t = (Math.cos(((h - 12) / 24) * Math.PI * 2) + 1) * 0.5;
    return THREE.MathUtils.clamp(t, 0, 1);
  }, [realMinutes]);
  const automaticDayLight = THREE.MathUtils.smoothstep(dayPhase, 0.15, 0.9);
  const dayLight =
    timeMode === 'day'
      ? 1
      : timeMode === 'night'
        ? 0
        : automaticDayLight;
  const isNight = dayLight < 0.22;
  const nightBlend = 1 - dayLight;
  const sunCycle = React.useMemo(() => {
    const t = (realMinutes / 1440) * Math.PI * 2;
    const sunX = Math.sin(t) * 320;
    const sunY = Math.max(-36, Math.cos(t) * 180);
    const sunZ = Math.cos(t) * 180;
    return [sunX, sunY, sunZ] as [number, number, number];
  }, [realMinutes]);

  const weatherCfg = React.useMemo(() => ({
    sunny: {
      fog: '#b7d0d9',
      fogDensity: 0.00042,
      cloudCount: 8,
      cloudOpacity: 0.72,
      cloudSpeed: 0.7,
      sky: { turbidity: 2.2, rayleigh: 1.2, mie: 0.0085 },
      ambient: 0.42,
      dir: 1.9,
      hemi: 0.7,
      rain: 0,
    },
    cloudy: {
      fog: '#b1c0c9',
      fogDensity: 0.00062,
      cloudCount: 21,
      cloudOpacity: 0.95,
      cloudSpeed: 1.0,
      sky: { turbidity: 5.5, rayleigh: 1.05, mie: 0.012 },
      ambient: 0.34,
      dir: 1.45,
      hemi: 0.55,
      rain: 0,
    },
    drizzle: {
      fog: '#9fb0ba',
      fogDensity: 0.00085,
      cloudCount: 21,
      cloudOpacity: 1,
      cloudSpeed: 1.25,
      sky: { turbidity: 7.2, rayleigh: 0.88, mie: 0.016 },
      ambient: 0.28,
      dir: 1.1,
      hemi: 0.45,
      rain: 0.45,
    },
    storm: {
      fog: '#798a98',
      fogDensity: 0.00135,
      cloudCount: 21,
      cloudOpacity: 1,
      cloudSpeed: 1.95,
      sky: { turbidity: 9.5, rayleigh: 0.72, mie: 0.022 },
      ambient: 0.13,
      dir: 0.48,
      hemi: 0.2,
      rain: 1.65,
    },
  }[weather]), [weather]);

  const fogColor = React.useMemo(() => {
    const dayFog = new THREE.Color(weatherCfg.fog);
    const nightFog = new THREE.Color('#0b1520');
    return `#${dayFog.lerp(nightFog, 1 - dayLight).getHexString()}`;
  }, [weatherCfg.fog, dayLight]);

  const ambientIntensity = weatherCfg.ambient * (0.25 + dayLight * 0.95);
  const hemiIntensity = weatherCfg.hemi * (0.22 + dayLight * 0.92);
  const dirIntensity = weatherCfg.dir * (0.12 + dayLight * 1.02);
  const moonLightIntensity = (0.22 + weatherCfg.hemi * 0.5) * nightBlend;
  const exposure = (weather === 'storm' ? 0.92 : weather === 'drizzle' ? 0.98 : 1.08) * (0.52 + dayLight * 0.72);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#bae6fd]">
      <Canvas
        shadows
        gl={{
          antialias: true,
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: exposure
        }}
        dpr={[1, 1.5]}
      >
        <fogExp2 attach="fog" args={[fogColor, weatherCfg.fogDensity * (isNight ? 1.18 : 1)]} />
        <PerspectiveCamera makeDefault fov={75} position={[0, 50, 50]} near={0.1} far={3000} />

        <PlayerController
          worldSize={worldSize}
          islandRadius={islandRadius}
          entities={entities}
          onUpdate={onUpdatePosition}
          onFootstep={onFootstep}
          keys={keysPressed}
          mode={cameraMode}
          initialPos={playerPosition}
          lastAttack={lastAttack}
          avatarType={useGameStore.getState().avatarType}
          isSitting={isSitting}
          isObserving={isObserving}
          isRifleAiming={isRifleAiming}
          binocularZoom={binocularZoom}
          seatPosition={seatPosition}
          seatYaw={seatYaw}
          observatoryPosition={observatoryPosition}
          observatoryYaw={observatoryYaw}
          onAimUpdate={onAimUpdate}
        />

        {/* Turn on the SUN */}
        <Sky
          sunPosition={sunCycle}
          turbidity={weatherCfg.sky.turbidity + (isNight ? 3.2 : dayLight < 0.4 ? 1.1 : 0)}
          rayleigh={weatherCfg.sky.rayleigh * (isNight ? 0.22 : dayLight < 0.4 ? 1.45 : 1)}
          mieCoefficient={weatherCfg.sky.mie * (isNight ? 0.45 : dayLight < 0.4 ? 1.2 : 1)}
          mieDirectionalG={isNight ? 0.94 : 0.82}
        />
        <StarField center={center} intensity={THREE.MathUtils.smoothstep(nightBlend, 0.35, 0.95)} />
        <mesh position={[center - 230, 220, center + 210]} visible={isNight}>
          <sphereGeometry args={[14, 30, 30]} />
          <meshStandardMaterial color="#eef4ff" emissive="#b9d1ff" emissiveIntensity={1.35} roughness={0.35} metalness={0.02} />
        </mesh>
        <mesh position={sunCycle} visible={!isNight}>
          <sphereGeometry args={[12, 20, 20]} />
          <meshBasicMaterial color="#ffe9b8" transparent opacity={0.82} />
        </mesh>
        <CartoonClouds center={center} count={weatherCfg.cloudCount} opacityMult={weatherCfg.cloudOpacity} speedMult={weatherCfg.cloudSpeed} />
        <ambientLight intensity={ambientIntensity} color={isNight ? '#9db4d4' : weather === 'storm' ? '#dbe7ff' : '#eef4ff'} />
        <hemisphereLight args={[isNight ? '#2c3e50' : '#f8f6e7', isNight ? '#0f1d2b' : '#567d46', hemiIntensity]} />
        <directionalLight
          position={[70, 120, 35]}
          intensity={dirIntensity}
          color={isNight ? '#9fc2ff' : '#fff4db'}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-80}
          shadow-camera-right={80}
          shadow-camera-top={80}
          shadow-camera-bottom={-80}
        />
        <directionalLight
          position={[-160, 210, 180]}
          intensity={moonLightIntensity}
          color="#bdd4ff"
        />
        {weatherCfg.rain > 0 && <RainField center={center} worldSize={worldSize} intensity={weatherCfg.rain} />}
        <StormFlash center={center} enabled={weather === 'storm'} />
        {/* Fog Removed for clear view */}

        {/* World Elements */}
        <group>
          <Terrain worldSize={worldSize} islandRadius={islandRadius} />
          <GrassField islandRadius={islandRadius} worldSize={worldSize} />
          <FlowerField islandRadius={islandRadius} worldSize={worldSize} />
          <LakeLife worldSize={worldSize} />
          <PetCompanions
            playerPosition={playerPosition}
            playerVelocity={velocity}
            worldSize={worldSize}
            islandRadius={islandRadius}
          />
          <Cabin
            position={[worldSize / 2 + 100, getTerrainHeight(worldSize / 2 + 100, worldSize / 2 - 80, worldSize, islandRadius), worldSize / 2 - 80]}
            computerOn={computerOn}
            computerScreenUrl={computerScreenUrl}
            isNight={isNight}
          />
        </group>

        {entities.map((ent) => {
          const scale = ent.size || 1;
          const groundContactBias =
            ent.type === 'WOOD' ? 0.14 * scale :
            ent.type === 'FOOD' ? 0.1 * scale :
            ent.type === 'STONE' ? 0.06 * scale :
            0.08 * scale;
          const sampleR =
            ent.type === 'WOOD' ? 0.95 * scale :
            ent.type === 'STONE' ? 0.75 * scale :
            ent.type === 'FOOD' ? 0.35 * scale :
            0.7 * scale;
          const sampleOffsets: Array<[number, number]> = [
            [0, 0],
            [sampleR, 0],
            [-sampleR, 0],
            [0, sampleR],
            [0, -sampleR],
            [sampleR * 0.7, sampleR * 0.7],
            [sampleR * 0.7, -sampleR * 0.7],
            [-sampleR * 0.7, sampleR * 0.7],
            [-sampleR * 0.7, -sampleR * 0.7],
          ];
          const hCenter = getTerrainHeight(ent.pos.x, ent.pos.y, worldSize, islandRadius);
          const baseY = Math.min(
            ...sampleOffsets.map(([ox, oz]) =>
              getTerrainHeight(ent.pos.x + ox, ent.pos.y + oz, worldSize, islandRadius)
            )
          );
          const mountainSink = THREE.MathUtils.smoothstep(hCenter, 8, 28) * 0.22;
          const terrainY = baseY - groundContactBias - mountainSink;
          return (
            <group key={ent.id} position={[ent.pos.x, terrainY, ent.pos.y]}>
              <ShakeGroup entity={ent} lastHit={lastHit}>
                <ForestElement entity={ent} />
              </ShakeGroup>
            </group>
          );
        })}

        {arrowShots.map((shot) => (
          <ArrowProjectile key={shot.id} shot={shot} />
        ))}

      </Canvas>
    </div>
  );
};
