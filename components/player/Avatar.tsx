import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AvatarType } from '../../types';
import { Rifle } from './Rifle';

interface AvatarProps {
  velocity: THREE.Vector2 | { length: () => number } | null | undefined;
  isWet: boolean;
  isFirstPerson: boolean;
  walkTime: React.MutableRefObject<number>;
  lastAttack?: number;
  avatarType?: AvatarType;
}

interface AvatarPalette {
  skin: string;
  skinShadow: string;
  top: string;
  bottom: string;
  shoe: string;
  accent: string;
  hair: string;
  eye: string;
}

interface LimbProps {
  limbRef: React.RefObject<THREE.Group | null>;
  subRef: React.RefObject<THREE.Group | null>;
  pos: [number, number, number];
  upperColor: string;
  lowerColor: string;
  shoeColor?: string;
  isUpper?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ velocity, isWet, isFirstPerson, walkTime, lastAttack, avatarType = 'gemini' }) => {
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
    const safeVelocity = velocity || { length: () => 0 };
    const speed = safeVelocity.length();
    const phase = walkTime.current;
    const time = state.clock.elapsedTime;
    const isMoving = speed > 0.5;
    const swing = Math.min(1.0, speed * 0.08);
    const lCycle = Math.sin(phase);
    const rCycle = Math.sin(phase + Math.PI);
    const lerp = THREE.MathUtils.lerp;
    const alpha = 0.2;

    if (lThigh.current && lShin.current) {
      lThigh.current.rotation.x = lerp(lThigh.current.rotation.x, lCycle * swing, alpha);
      lShin.current.rotation.x = lerp(lShin.current.rotation.x, lCycle < 0 ? -Math.abs(lCycle) * 1.5 * swing : -0.1, alpha);
    }
    if (rThigh.current && rShin.current) {
      rThigh.current.rotation.x = lerp(rThigh.current.rotation.x, rCycle * swing, alpha);
      rShin.current.rotation.x = lerp(rShin.current.rotation.x, rCycle < 0 ? -Math.abs(rCycle) * 1.5 * swing : -0.1, alpha);
    }

    if (hips.current && chest.current) {
      const bob = Math.abs(Math.cos(phase)) * swing * 0.16;
      hips.current.position.y = lerp(hips.current.position.y, 0.95 + (isMoving ? bob : Math.sin(time * 0.8) * 0.015), alpha);
      hips.current.rotation.y = lerp(hips.current.rotation.y, isMoving ? Math.sin(phase + Math.PI / 2) * swing * 0.18 : 0, alpha);
      chest.current.rotation.y = lerp(chest.current.rotation.y, isMoving ? -hips.current.rotation.y * 1.3 : 0, alpha);
      chest.current.rotation.x = lerp(chest.current.rotation.x, isMoving ? (speed / 350) * 0.5 : Math.sin(time * 1.2) * 0.01, alpha);
    }

    if (lUpperArm.current && lForearm.current) {
      lUpperArm.current.rotation.x = lerp(lUpperArm.current.rotation.x, rCycle * swing * 1.5, alpha);
      lForearm.current.rotation.x = lerp(lForearm.current.rotation.x, Math.max(0.35, Math.abs(rCycle) * swing * 1.2), alpha);
    }

    const timeSinceAttack = Date.now() - (lastAttack || 0);
    const isAttacking = timeSinceAttack < 400;

    if (rUpperArm.current && rForearm.current) {
      if (isAttacking) {
        const t = timeSinceAttack / 400;
        let tx = 0;
        let fx = 0;
        if (t < 0.3) {
          tx = -Math.PI / 2 - (t / 0.3) * 0.5;
          fx = 1.5;
        } else if (t < 0.6) {
          tx = -Math.PI / 2 - 0.5 + ((t - 0.3) / 0.3) * 2.5;
          fx = 1.5 - ((t - 0.3) / 0.3) * 1.2;
        } else {
          tx = -Math.PI / 2 - 0.5 + 2.5 - ((t - 0.6) / 0.4) * 2.0;
          fx = 0.3 + ((t - 0.6) / 0.4) * 0.1;
        }
        rUpperArm.current.rotation.x = lerp(rUpperArm.current.rotation.x, tx, 0.4);
        rForearm.current.rotation.x = lerp(rForearm.current.rotation.x, fx, 0.4);
      } else {
        rUpperArm.current.rotation.x = lerp(rUpperArm.current.rotation.x, lCycle * swing * 1.5, alpha);
        rForearm.current.rotation.x = lerp(rForearm.current.rotation.x, Math.max(0.35, Math.abs(lCycle) * swing * 1.2), alpha);
      }
    }

    if (headGroup.current) {
      headGroup.current.rotation.x = lerp(headGroup.current.rotation.x, isMoving ? -Math.sin(phase * 2) * swing * 0.12 : Math.sin(time * 0.6) * 0.03, alpha);
    }
  });

  const Limb: React.FC<LimbProps> = ({ limbRef, subRef, pos, upperColor, lowerColor, shoeColor = '#1a1a1a', isUpper = true }) => (
    <group ref={limbRef} position={pos}>
      <mesh castShadow position={[0, -0.2, 0]}>
        <capsuleGeometry args={[isUpper ? 0.072 : 0.082, isUpper ? 0.42 : 0.4, 6, 12]} />
        <meshStandardMaterial color={upperColor} roughness={0.82} metalness={0.04} />
      </mesh>
      <group ref={subRef} position={[0, -0.4, 0]}>
        <mesh castShadow position={[0, -0.16, 0]}>
          <capsuleGeometry args={[isUpper ? 0.064 : 0.074, isUpper ? 0.34 : 0.36, 6, 12]} />
          <meshStandardMaterial color={lowerColor} roughness={0.76} metalness={0.03} />
        </mesh>
        {!isUpper && (
          <group position={[0, -0.37, 0.03]}>
            <mesh castShadow>
              <boxGeometry args={[0.135, 0.11, 0.23]} />
              <meshStandardMaterial color={shoeColor} roughness={0.64} metalness={0.08} />
            </mesh>
            <mesh position={[0, -0.04, 0.09]} castShadow>
              <boxGeometry args={[0.13, 0.03, 0.07]} />
              <meshStandardMaterial color="#f5f5f5" roughness={0.35} metalness={0.02} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );

  const styles: Record<AvatarType, AvatarPalette> = {
    gemini: {
      skin: '#d7a67a',
      skinShadow: '#c28a63',
      top: isWet ? '#3d4c3d' : '#5f7751',
      bottom: isWet ? '#2c2218' : '#4f3d2f',
      shoe: '#232323',
      accent: '#ba2d35',
      hair: '#2e2c2a',
      eye: '#36261d',
    },
    classic: {
      skin: '#c68e63',
      skinShadow: '#ae744f',
      top: isWet ? '#1f3550' : '#2f5d8f',
      bottom: isWet ? '#222831' : '#3b4451',
      shoe: '#f2f2f2',
      accent: '#f09d4b',
      hair: '#1e1f22',
      eye: '#2a1f1a',
    },
    blocky: {
      skin: '#ebbe8f',
      skinShadow: '#d39e72',
      top: isWet ? '#7b2f30' : '#c74444',
      bottom: isWet ? '#191919' : '#2c2c2c',
      shoe: '#ededed',
      accent: '#f4f4f4',
      hair: '#3a2b1f',
      eye: '#2f2119',
    },
    robot: {
      skin: '#9d6a3f',
      skinShadow: '#835230',
      top: isWet ? '#354252' : '#596677',
      bottom: isWet ? '#2d3644' : '#516073',
      shoe: '#1d1d1d',
      accent: '#e28a2f',
      hair: '#272727',
      eye: '#261b14',
    },
  };

  const style = styles[avatarType] || styles.gemini;

  return (
    <group>
      <group ref={hips} position={[0, 0.95, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.39, 0.21, 0.22]} />
          <meshStandardMaterial color={style.bottom} roughness={0.86} metalness={0.03} />
        </mesh>

        {(avatarType === 'gemini' || avatarType === 'robot') && (
          <group position={[0, 0.05, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.42, 0.08, 0.24]} />
              <meshStandardMaterial color={avatarType === 'gemini' ? '#3e2723' : style.accent} roughness={0.72} metalness={0.1} />
            </mesh>
            <mesh position={[0.14, -0.02, 0.12]} castShadow>
              <boxGeometry args={[0.1, 0.12, 0.06]} />
              <meshStandardMaterial color="#4e342e" roughness={0.78} metalness={0.03} />
            </mesh>
            <mesh position={[-0.14, -0.02, 0.12]} castShadow>
              <boxGeometry args={[0.1, 0.12, 0.06]} />
              <meshStandardMaterial color="#4e342e" roughness={0.78} metalness={0.03} />
            </mesh>
          </group>
        )}

        <Limb limbRef={lThigh} subRef={lShin} pos={[-0.175, -0.05, 0]} upperColor={style.bottom} lowerColor={style.bottom} shoeColor={style.shoe} isUpper={false} />
        <Limb limbRef={rThigh} subRef={rShin} pos={[0.175, -0.05, 0]} upperColor={style.bottom} lowerColor={style.bottom} shoeColor={style.shoe} isUpper={false} />

        <group ref={chest} position={[0, 0.3, 0]}>
          <mesh castShadow position={[0, 0.05, 0]}>
            <boxGeometry args={[0.35, 0.46, 0.23]} />
            <meshStandardMaterial color={style.top} roughness={0.86} metalness={0.02} />
          </mesh>
          <mesh castShadow position={[0, 0.22, 0.01]}>
            <capsuleGeometry args={[0.24, 0.32, 6, 12]} />
            <meshStandardMaterial color={style.top} roughness={0.84} metalness={0.02} />
          </mesh>

          {avatarType === 'classic' && (
            <group position={[0, 0.52, -0.13]}>
              <mesh castShadow>
                <boxGeometry args={[0.29, 0.17, 0.1]} />
                <meshStandardMaterial color={style.top} roughness={0.8} metalness={0.02} />
              </mesh>
            </group>
          )}

          {(avatarType === 'gemini' || avatarType === 'robot') && !isFirstPerson && (
            <group position={[0, 0.29, -0.24]}>
              <mesh castShadow>
                <boxGeometry args={[0.33, 0.43, 0.15]} />
                <meshStandardMaterial color="#2c3b42" roughness={0.8} metalness={0.08} />
              </mesh>
              <mesh position={[0, 0.11, 0.08]} castShadow>
                <boxGeometry args={[0.26, 0.09, 0.04]} />
                <meshStandardMaterial color="#3a4a53" roughness={0.72} metalness={0.08} />
              </mesh>
            </group>
          )}

          <Limb limbRef={lUpperArm} subRef={lForearm} pos={[-0.34, 0.45, 0]} upperColor={style.top} lowerColor={style.skin} />

          <group ref={rUpperArm} position={[0.34, 0.45, 0]}>
            <mesh castShadow position={[0, -0.2, 0]}>
              <capsuleGeometry args={[0.07, 0.38, 6, 12]} />
              <meshStandardMaterial color={style.top} roughness={0.83} metalness={0.02} />
            </mesh>
            <group ref={rForearm} position={[0, -0.38, 0]}>
              <mesh castShadow position={[0, -0.15, 0]}>
                <capsuleGeometry args={[0.062, 0.31, 6, 12]} />
                <meshStandardMaterial color={style.skin} roughness={0.62} metalness={0.02} />
              </mesh>
              <mesh castShadow position={[0, -0.33, 0.01]}>
                <sphereGeometry args={[0.055, 14, 12]} />
                <meshStandardMaterial color={style.skinShadow} roughness={0.58} metalness={0.02} />
              </mesh>
              <Rifle />
            </group>
          </group>

          <group ref={headGroup} position={[0, 0.57, 0]} visible={!isFirstPerson}>
            <mesh castShadow position={[0, 0.03, 0]}>
              <cylinderGeometry args={[0.07, 0.08, 0.08, 16]} />
              <meshStandardMaterial color={style.skinShadow} roughness={0.62} metalness={0.02} />
            </mesh>

            <mesh castShadow position={[0, 0.27, 0.01]}>
              <sphereGeometry args={[0.17, 24, 22]} />
              <meshStandardMaterial color={style.skin} roughness={0.58} metalness={0.02} />
            </mesh>

            <mesh position={[0, 0.31, 0.155]} castShadow>
              <boxGeometry args={[0.05, 0.035, 0.02]} />
              <meshStandardMaterial color={style.skinShadow} roughness={0.6} metalness={0.02} />
            </mesh>

            <group position={[0, 0.29, 0.157]}>
              <mesh position={[-0.058, 0.012, 0]}>
                <sphereGeometry args={[0.016, 10, 10]} />
                <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.04} />
              </mesh>
              <mesh position={[0.058, 0.012, 0]}>
                <sphereGeometry args={[0.016, 10, 10]} />
                <meshStandardMaterial color="#ffffff" roughness={0.25} metalness={0.04} />
              </mesh>
              <mesh position={[-0.058, 0.012, 0.008]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshStandardMaterial color={style.eye} roughness={0.22} metalness={0.1} />
              </mesh>
              <mesh position={[0.058, 0.012, 0.008]}>
                <sphereGeometry args={[0.008, 8, 8]} />
                <meshStandardMaterial color={style.eye} roughness={0.22} metalness={0.1} />
              </mesh>
              <mesh position={[-0.058, 0.038, -0.004]}>
                <boxGeometry args={[0.042, 0.007, 0.01]} />
                <meshStandardMaterial color={style.hair} roughness={0.82} metalness={0.01} />
              </mesh>
              <mesh position={[0.058, 0.038, -0.004]}>
                <boxGeometry args={[0.042, 0.007, 0.01]} />
                <meshStandardMaterial color={style.hair} roughness={0.82} metalness={0.01} />
              </mesh>
            </group>

            <mesh position={[0, 0.21, 0.162]}>
              <boxGeometry args={[0.055, 0.006, 0.01]} />
              <meshStandardMaterial color="#9b5347" roughness={0.55} metalness={0.01} />
            </mesh>

            {avatarType === 'gemini' && (
              <group position={[0, 0.3, 0.02]}>
                <mesh position={[0, -0.08, 0.125]} castShadow>
                  <boxGeometry args={[0.31, 0.075, 0.04]} />
                  <meshStandardMaterial color={style.accent} roughness={0.7} metalness={0.02} />
                </mesh>
                <mesh position={[0, -0.04, -0.14]} castShadow>
                  <sphereGeometry args={[0.034, 12, 12]} />
                  <meshStandardMaterial color={style.accent} roughness={0.7} metalness={0.02} />
                </mesh>
              </group>
            )}

            {avatarType === 'blocky' && (
              <mesh position={[0, 0.39, 0]} castShadow>
                <boxGeometry args={[0.29, 0.05, 0.28]} />
                <meshStandardMaterial color={style.accent} roughness={0.72} metalness={0.02} />
              </mesh>
            )}

            {avatarType === 'robot' && (
              <group position={[0, 0.3, 0.16]}>
                <mesh castShadow>
                  <boxGeometry args={[0.28, 0.09, 0.04]} />
                  <meshStandardMaterial color="#222" roughness={0.35} metalness={0.5} />
                </mesh>
                <mesh position={[-0.07, 0, 0.01]}>
                  <boxGeometry args={[0.1, 0.06, 0.02]} />
                  <meshStandardMaterial color={style.accent} transparent opacity={0.55} roughness={0.3} metalness={0.45} />
                </mesh>
                <mesh position={[0.07, 0, 0.01]}>
                  <boxGeometry args={[0.1, 0.06, 0.02]} />
                  <meshStandardMaterial color={style.accent} transparent opacity={0.55} roughness={0.3} metalness={0.45} />
                </mesh>
              </group>
            )}

            <mesh position={[0, 0.39, -0.01]} castShadow>
              <sphereGeometry args={[0.13, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.9]} />
              <meshStandardMaterial color={style.hair} roughness={0.86} metalness={0.01} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};
