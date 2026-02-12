
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Axe } from './Axe';

interface AvatarProps {
    velocity: THREE.Vector2 | { length: () => number } | null | undefined;
    isWet: boolean;
    isFirstPerson: boolean;
    walkTime: React.MutableRefObject<number>;
    lastAttack?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ velocity, isWet, isFirstPerson, walkTime, lastAttack }) => {
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
                const t = timeSinceAttack / 400;
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
    const skinColor = "#e0ac69";
    const clothColor = isWet ? "#2d3748" : "#4a5568";
    const pantsColor = isWet ? "#1a202c" : "#2f3542";
    const gearColor = "#8d5524";
    const bootColor = "#1a202c";

    return (
        <group>
            <group ref={hips} position={[0, 0.95, 0]}>
                {/* Hips & Belt */}
                <mesh castShadow>
                    <boxGeometry args={[0.38, 0.22, 0.20]} />
                    <meshStandardMaterial color={pantsColor} roughness={0.9} />
                </mesh>
                {/* Utility Belt */}
                <group position={[0, 0.05, 0]}>
                    <mesh castShadow>
                        <boxGeometry args={[0.40, 0.08, 0.23]} />
                        <meshStandardMaterial color={gearColor} roughness={0.6} />
                    </mesh>
                    <mesh position={[0.12, 0, 0.12]} castShadow>
                        <boxGeometry args={[0.08, 0.1, 0.04]} />
                        <meshStandardMaterial color={gearColor} roughness={0.6} />
                    </mesh>
                    <mesh position={[-0.12, 0, 0.12]} castShadow>
                        <boxGeometry args={[0.08, 0.1, 0.04]} />
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
                    {/* Torso - HIDE IN 1P */}
                    {!isFirstPerson && (
                        <mesh castShadow position={[0, 0.25, 0]}>
                            <boxGeometry args={[0.48, 0.55, 0.26]} />
                            <meshStandardMaterial color={clothColor} roughness={0.9} />
                        </mesh>
                    )}

                    {/* Backpack - HIDE IN 1P */}
                    {!isFirstPerson && (
                        <group position={[0, 0.3, -0.2]}>
                            <mesh castShadow>
                                <boxGeometry args={[0.35, 0.45, 0.15]} />
                                <meshStandardMaterial color="#3e3935" roughness={1.0} />
                            </mesh>
                            <mesh position={[0, 0.25, 0]} rotation={[0, 0, 1.57]}>
                                <capsuleGeometry args={[0.08, 0.36, 4, 8]} />
                                <meshStandardMaterial color="#5d6d7e" roughness={0.9} />
                            </mesh>
                        </group>
                    )}

                    {/* Neck/Head - HIDE IN 1P */}
                    <group position={[0, 0.55, 0]}>
                        {!isFirstPerson && (
                            <mesh castShadow position={[0, 0.05, 0]}>
                                <cylinderGeometry args={[0.07, 0.09, 0.12, 8]} />
                                <meshStandardMaterial color={skinColor} roughness={0.8} />
                            </mesh>
                        )}
                        <group ref={headGroup} position={[0, 0.24, 0]} visible={!isFirstPerson}>
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
