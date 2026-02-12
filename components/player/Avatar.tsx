
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { AvatarType } from '../../types';
import { Axe } from './Axe';

interface AvatarProps {
    velocity: THREE.Vector2 | { length: () => number } | null | undefined;
    isWet: boolean;
    isFirstPerson: boolean;
    walkTime: React.MutableRefObject<number>;
    lastAttack?: number;
    avatarType?: AvatarType;
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
                let tx = 0, fx = 0;
                if (t < 0.3) { tx = -Math.PI / 2 - (t / 0.3 * 0.5); fx = 1.5; }
                else if (t < 0.6) { tx = (-Math.PI / 2 - 0.5) + ((t - 0.3) / 0.3 * 2.5); fx = 1.5 - ((t - 0.3) / 0.3 * 1.2); }
                else { tx = (-Math.PI / 2 - 0.5 + 2.5) - ((t - 0.6) / 0.4 * 2.0); fx = 0.3 + ((t - 0.6) / 0.4 * 0.1); }
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

    // Helper for rendering a standard human limb
    const Limb = ({ limbRef, subRef, pos, colors, isUpper = true }: any) => (
        <group ref={limbRef} position={pos}>
            <mesh castShadow position={[0, -0.18, 0]}>
                <capsuleGeometry args={[isUpper ? 0.08 : 0.09, 0.4, 4, 8]} />
                <meshStandardMaterial color={colors.top} />
            </mesh>
            <group ref={subRef} position={[0, -0.4, 0]}>
                <mesh castShadow position={[0, -0.15, 0]}>
                    <capsuleGeometry args={[isUpper ? 0.07 : 0.08, 0.35, 4, 8]} />
                    <meshStandardMaterial color={colors.bottom} />
                </mesh>
                {!isUpper && (
                    <mesh position={[0, -0.38, 0.03]} castShadow>
                        <boxGeometry args={[0.12, 0.15, 0.22]} />
                        <meshStandardMaterial color={colors.shoe || "#1a1a1a"} />
                    </mesh>
                )}
            </group>
        </group>
    );

    // Character Styling Data
    const styles = {
        gemini: { // Survivor
            skin: "#e0ac69",
            top: isWet ? "#3e4a3e" : "#556b2f", // Olive Green
            bottom: isWet ? "#2b1e15" : "#4e342e", // Brown
            shoe: "#1a1a1a",
            accent: "#d32f2f" // Red Bandana
        },
        classic: { // Urban
            skin: "#c68642",
            top: isWet ? "#1a365d" : "#2b6cb0", // Blue Hoodie
            bottom: isWet ? "#1a202c" : "#2d3748", // Dark Grey Jeans
            shoe: "#ffffff",
            accent: "#f6ad55" // Orange details
        },
        blocky: { // Athlete
            skin: "#f1c27d",
            top: isWet ? "#742a2a" : "#c53030", // Red Track Jacket
            bottom: isWet ? "#171717" : "#262626", // Black Shorts
            shoe: "#ffffff",
            accent: "#ffffff" // White Headband
        },
        robot: { // Technical
            skin: "#8d5524",
            top: isWet ? "#2d3748" : "#4a5568", // Grey Jumpsuit
            bottom: isWet ? "#2d3748" : "#4a5568",
            shoe: "#1a1a1a",
            accent: "#ed8936" // Orange tool belt/goggles
        }
    };

    const style = styles[avatarType] || styles.gemini;

    return (
        <group>
            <group ref={hips} position={[0, 0.95, 0]}>
                {/* Hips & Lower Body */}
                <mesh castShadow>
                    <boxGeometry args={[0.38, 0.22, 0.2]} />
                    <meshStandardMaterial color={style.bottom} />
                </mesh>

                {/* Accessory: Belt */}
                {(avatarType === 'gemini' || avatarType === 'robot') && (
                    <group position={[0, 0.05, 0]}>
                        <mesh castShadow><boxGeometry args={[0.42, 0.08, 0.24]} /><meshStandardMaterial color={avatarType === 'gemini' ? "#3e2723" : style.accent} /></mesh>
                        <mesh position={[0.14, -0.02, 0.12]} castShadow><boxGeometry args={[0.1, 0.12, 0.06]} /><meshStandardMaterial color="#4e342e" /></mesh>
                        <mesh position={[-0.14, -0.02, 0.12]} castShadow><boxGeometry args={[0.1, 0.12, 0.06]} /><meshStandardMaterial color="#4e342e" /></mesh>
                    </group>
                )}

                {/* Lower Limbs */}
                <Limb limbRef={lThigh} subRef={lShin} pos={[-0.18, -0.05, 0]} colors={{ top: style.bottom, bottom: style.bottom, shoe: style.shoe }} isUpper={false} />
                <Limb limbRef={rThigh} subRef={rShin} pos={[0.18, -0.05, 0]} colors={{ top: style.bottom, bottom: style.bottom, shoe: style.shoe }} isUpper={false} />

                {/* Torso & Upper Body */}
                <group ref={chest} position={[0, 0.3, 0]}>
                    <mesh castShadow position={[0, 0.25, 0]}>
                        <boxGeometry args={[0.48, 0.55, 0.26]} />
                        <meshStandardMaterial color={style.top} />
                    </mesh>

                    {/* Hoodie Detail for Urban */}
                    {avatarType === 'classic' && (
                        <group position={[0, 0.5, -0.15]}>
                            <mesh castShadow><boxGeometry args={[0.3, 0.2, 0.1]} /><meshStandardMaterial color={style.top} /></mesh>
                        </group>
                    )}

                    {/* Backpack for Survivor/Technical */}
                    {(avatarType === 'gemini' || avatarType === 'robot') && !isFirstPerson && (
                        <group position={[0, 0.3, -0.22]}>
                            <mesh castShadow><boxGeometry args={[0.36, 0.45, 0.18]} /><meshStandardMaterial color="#263238" /></mesh>
                            <mesh position={[0, 0.12, 0.1]} castShadow><boxGeometry args={[0.28, 0.1, 0.05]} /><meshStandardMaterial color="#37474f" /></mesh>
                        </group>
                    )}

                    {/* Arms */}
                    <Limb limbRef={lUpperArm} subRef={lForearm} pos={[-0.34, 0.45, 0]} colors={{ top: style.top, bottom: style.skin }} />
                    <group ref={rUpperArm} position={[0.34, 0.45, 0]}>
                        <mesh castShadow position={[0, -0.18, 0]}><capsuleGeometry args={[0.07, 0.38, 4, 8]} /><meshStandardMaterial color={style.top} /></mesh>
                        <group ref={rForearm} position={[0, -0.38, 0]}>
                            <mesh castShadow position={[0, -0.15, 0]}><capsuleGeometry args={[0.06, 0.3, 4, 8]} /><meshStandardMaterial color={style.skin} /></mesh>
                            <Axe />
                        </group>
                    </group>

                    {/* Head & Features */}
                    <group ref={headGroup} position={[0, 0.55, 0]} visible={!isFirstPerson}>
                        <mesh castShadow position={[0, 0.24, 0]}>
                            <boxGeometry args={[0.26, 0.3, 0.28]} />
                            <meshStandardMaterial color={style.skin} />
                        </mesh>

                        {/* Eyes */}
                        <group position={[0, 0.3, 0.14]}>
                            <mesh position={[-0.08, 0, 0]}><boxGeometry args={[0.06, 0.02, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
                            <mesh position={[0.08, 0, 0]}><boxGeometry args={[0.06, 0.02, 0.01]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
                        </group>

                        {/* Bandana (Survivor) */}
                        {avatarType === 'gemini' && (
                            <group position={[0, 0.26, 0.02]}>
                                <mesh position={[0, -0.1, 0.13]} castShadow><boxGeometry args={[0.28, 0.08, 0.04]} /><meshStandardMaterial color={style.accent} /></mesh>
                                <mesh position={[0, -0.05, -0.15]} castShadow><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color={style.accent} /></mesh>
                            </group>
                        )}

                        {/* Headband (Athlete) */}
                        {avatarType === 'blocky' && (
                            <mesh position={[0, 0.35, 0]} castShadow>
                                <boxGeometry args={[0.28, 0.06, 0.3]} />
                                <meshStandardMaterial color={style.accent} />
                            </mesh>
                        )}

                        {/* Goggles (Technical) */}
                        {avatarType === 'robot' && (
                            <group position={[0, 0.3, 0.15]}>
                                <mesh castShadow><boxGeometry args={[0.28, 0.1, 0.04]} /><meshStandardMaterial color="#212121" /></mesh>
                                <mesh position={[-0.07, 0, 0.01]}><boxGeometry args={[0.1, 0.06, 0.02]} /><meshStandardMaterial color={style.accent} transparent opacity={0.6} /></mesh>
                                <mesh position={[0.07, 0, 0.01]}><boxGeometry args={[0.1, 0.06, 0.02]} /><meshStandardMaterial color={style.accent} transparent opacity={0.6} /></mesh>
                            </group>
                        )}

                        {/* Hair/Hat Placeholder */}
                        <mesh position={[0, 0.4, 0]} castShadow>
                            <boxGeometry args={[0.24, 0.05, 0.24]} />
                            <meshStandardMaterial color="#263238" />
                        </mesh>
                    </group>
                </group>
            </group>
        </group>
    );
};
