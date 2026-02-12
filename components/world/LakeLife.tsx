import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LAKES } from '../../utils/constants';
import { getTerrainHeight } from '../../utils/terrainUtils';

// Fish Component - Realistic model with self-contained animation
const Fish: React.FC<{ position: [number, number, number]; rotation: number; tailWag: number; phase: number }> = ({ position, rotation, tailWag, phase }) => {
    const groupRef = useRef<THREE.Group>(null);
    const tailRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (tailRef.current) {
            const wag = Math.sin(state.clock.elapsedTime * 6 + phase) * 0.6;
            tailRef.current.rotation.y = wag * 0.3;
        }
        if (groupRef.current) {
            groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.5 + phase) * 0.08;
        }
    });

    return (
        <group ref={groupRef} position={position} rotation={[0, rotation, 0]} scale={1.5}>
            {/* Main Body - Elongated ellipsoid */}
            <mesh position={[0, 0, 0]} scale={[1.2, 0.8, 0.6]}>
                <sphereGeometry args={[0.3, 12, 8]} />
                <meshStandardMaterial
                    color="#ff7f50"
                    roughness={0.2}
                    metalness={0.6}
                    emissive="#ff4500"
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Tail Base */}
            <mesh position={[-0.35, 0, 0]} scale={[0.6, 0.5, 0.4]}>
                <sphereGeometry args={[0.15, 8, 6]} />
                <meshStandardMaterial color="#ff6347" roughness={0.3} metalness={0.5} />
            </mesh>

            {/* Tail Fin - V-shaped with wagging */}
            <group ref={tailRef} position={[-0.5, 0, 0]}>
                {/* Upper tail fin */}
                <mesh position={[-0.1, 0.08, 0]} rotation={[0, 0, -Math.PI / 6]}>
                    <boxGeometry args={[0.25, 0.02, 0.15]} />
                    <meshStandardMaterial color="#ff4500" roughness={0.3} transparent opacity={0.9} />
                </mesh>
                {/* Lower tail fin */}
                <mesh position={[-0.1, -0.08, 0]} rotation={[0, 0, Math.PI / 6]}>
                    <boxGeometry args={[0.25, 0.02, 0.15]} />
                    <meshStandardMaterial color="#ff4500" roughness={0.3} transparent opacity={0.9} />
                </mesh>
            </group>

            {/* Dorsal Fin (top) */}
            <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0]}>
                <coneGeometry args={[0.12, 0.25, 4]} />
                <meshStandardMaterial color="#ff6347" roughness={0.3} transparent opacity={0.85} />
            </mesh>

            {/* Pectoral Fins (sides) - more realistic placement */}
            <mesh position={[0.1, -0.1, 0.2]} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
                <boxGeometry args={[0.2, 0.02, 0.15]} />
                <meshStandardMaterial color="#ff7f50" roughness={0.3} transparent opacity={0.8} />
            </mesh>
            <mesh position={[0.1, -0.1, -0.2]} rotation={[-Math.PI / 3, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.2, 0.02, 0.15]} />
                <meshStandardMaterial color="#ff7f50" roughness={0.3} transparent opacity={0.8} />
            </mesh>

            {/* Eyes */}
            <mesh position={[0.3, 0.1, 0.15]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.8} />
            </mesh>
            <mesh position={[0.3, 0.1, -0.15]}>
                <sphereGeometry args={[0.05, 8, 8]} />
                <meshStandardMaterial color="#000000" roughness={0.1} metalness={0.8} />
            </mesh>
        </group>
    );
};

// Frog Component - Improved realistic model
const Frog: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <group position={position}>
            {/* Main Body - wider and flatter */}
            <mesh position={[0, 0, 0]} scale={[1.3, 0.8, 1.1]}>
                <sphereGeometry args={[0.25, 12, 10]} />
                <meshStandardMaterial
                    color="#22c55e"
                    roughness={0.3}
                    metalness={0.1}
                    emissive="#15803d"
                    emissiveIntensity={0.05}
                />
            </mesh>

            {/* Head/Face area */}
            <mesh position={[0.2, 0.08, 0]} scale={[0.9, 0.7, 0.9]}>
                <sphereGeometry args={[0.18, 10, 8]} />
                <meshStandardMaterial color="#16a34a" roughness={0.25} metalness={0.1} />
            </mesh>

            {/* Eye bulges */}
            <mesh position={[0.15, 0.22, 0.12]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#22c55e" roughness={0.2} metalness={0.1} />
            </mesh>
            <mesh position={[0.15, 0.22, -0.12]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#22c55e" roughness={0.2} metalness={0.1} />
            </mesh>

            {/* Eyes - bigger and more prominent */}
            <mesh position={[0.22, 0.25, 0.12]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color="#fbbf24" roughness={0.05} metalness={0.7} />
            </mesh>
            <mesh position={[0.22, 0.25, -0.12]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshStandardMaterial color="#fbbf24" roughness={0.05} metalness={0.7} />
            </mesh>

            {/* Pupils */}
            <mesh position={[0.28, 0.25, 0.12]}>
                <sphereGeometry args={[0.035, 6, 6]} />
                <meshStandardMaterial color="#000000" />
            </mesh>
            <mesh position={[0.28, 0.25, -0.12]}>
                <sphereGeometry args={[0.035, 6, 6]} />
                <meshStandardMaterial color="#000000" />
            </mesh>

            {/* Back Legs - thicker and more frog-like */}
            <mesh position={[-0.2, -0.08, 0.18]} rotation={[0, 0, Math.PI / 3]}>
                <cylinderGeometry args={[0.06, 0.05, 0.35, 8]} />
                <meshStandardMaterial color="#16a34a" roughness={0.35} />
            </mesh>
            <mesh position={[-0.2, -0.08, -0.18]} rotation={[0, 0, Math.PI / 3]}>
                <cylinderGeometry args={[0.06, 0.05, 0.35, 8]} />
                <meshStandardMaterial color="#16a34a" roughness={0.35} />
            </mesh>

            {/* Front Legs - smaller */}
            <mesh position={[0.15, -0.12, 0.22]} rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.04, 0.03, 0.2, 6]} />
                <meshStandardMaterial color="#16a34a" roughness={0.35} />
            </mesh>
            <mesh position={[0.15, -0.12, -0.22]} rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.04, 0.03, 0.2, 6]} />
                <meshStandardMaterial color="#16a34a" roughness={0.35} />
            </mesh>

            {/* Belly - lighter color */}
            <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.1, 0.9, 0.6]}>
                <circleGeometry args={[0.2, 16]} />
                <meshStandardMaterial color="#86efac" roughness={0.4} />
            </mesh>
        </group>
    );
};

export const LakeLife: React.FC<{ worldSize: number }> = ({ worldSize }) => {
    const fishGroupRef = useRef<THREE.Group>(null);
    const frogGroupRef = useRef<THREE.Group>(null);

    const lakeWaterY = -0.15;

    // Fish Data - with mutable state for natural movement
    const fishData = useMemo(() => {
        const count = 30;
        return Array.from({ length: count }).map((_, i) => {
            const lake = LAKES[i % LAKES.length];
            const angle = Math.random() * Math.PI * 2;
            const r = Math.random() * (lake.r - 3);

            return {
                lakeIndex: i % LAKES.length,
                lakeCenter: { x: worldSize / 2 + lake.x, z: worldSize / 2 + lake.z },
                lakeRadius: lake.r,
                x: worldSize / 2 + lake.x + Math.cos(angle) * r,
                z: worldSize / 2 + lake.z + Math.sin(angle) * r,
                y: 0.05 + Math.random() * 0.15,
                targetAngle: angle,
                currentAngle: angle,
                speed: 0.5 + Math.random() * 0.5,
                nextDirectionChange: Math.random() * 5,
                phase: Math.random() * Math.PI * 2,
                verticalPhase: Math.random() * Math.PI * 2
            };
        });
    }, [worldSize]);

    // Frog Data - with hopping state
    const frogData = useMemo(() => {
        const count = 12;
        return Array.from({ length: count }).map((_, i) => {
            const lake = LAKES[i % LAKES.length];
            const angle = Math.random() * Math.PI * 2;
            const r = lake.r - 1 + Math.random() * 1.5;

            return {
                lakeIndex: i % LAKES.length,
                lakeCenter: { x: worldSize / 2 + lake.x, z: worldSize / 2 + lake.z },
                lakeRadius: lake.r,
                x: worldSize / 2 + lake.x + Math.cos(angle) * r,
                z: worldSize / 2 + lake.z + Math.sin(angle) * r,
                y: 0.1,
                targetX: 0,
                targetZ: 0,
                isJumping: false,
                jumpProgress: 0,
                rotation: angle,
                nextHopTime: Math.random() * 3 + 2
            };
        });
    }, [worldSize]);

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime;
        const islandRadius = 220; // Aligned with constants.ts

        // Animate Fish - Smooth, natural swimming
        if (fishGroupRef.current) {
            fishGroupRef.current.children.forEach((fish, i) => {
                const data = fishData[i];

                data.nextDirectionChange -= delta;
                if (data.nextDirectionChange <= 0) {
                    data.targetAngle = Math.random() * Math.PI * 2;
                    data.nextDirectionChange = 3 + Math.random() * 5;
                }

                let angleDiff = data.targetAngle - data.currentAngle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                data.currentAngle += angleDiff * delta * 0.3;

                const swimSpeed = 1.2 * delta;
                data.x += Math.cos(data.currentAngle) * swimSpeed;
                data.z += Math.sin(data.currentAngle) * swimSpeed;

                const distFromCenter = Math.hypot(data.x - data.lakeCenter.x, data.z - data.lakeCenter.z);
                if (distFromCenter > data.lakeRadius - 3) {
                    const angleToCenter = Math.atan2(data.lakeCenter.z - data.z, data.lakeCenter.x - data.x);
                    data.targetAngle = angleToCenter + (Math.random() - 0.5) * Math.PI * 0.5;
                    data.nextDirectionChange = 2;
                }

                const fishDepthBase = 0.25; // Adjusted for better visibility
                const fishDepthWiggle = 0.1;
                const desiredY =
                    lakeWaterY -
                    fishDepthBase +
                    Math.sin(time * 1.2 + data.verticalPhase) * fishDepthWiggle;
                data.y = Math.min(lakeWaterY - 0.02, desiredY);

                fish.position.set(data.x, data.y, data.z);
                fish.rotation.y = -data.currentAngle;
            });
        }

        // Animate Frogs
        if (frogGroupRef.current) {
            frogGroupRef.current.children.forEach((frog, i) => {
                const data = frogData[i];

                if (!data.isJumping) {
                    data.nextHopTime -= delta;
                    if (data.nextHopTime <= 0) {
                        data.isJumping = true;
                        data.jumpProgress = 0;
                        const angle = Math.random() * Math.PI * 2;
                        const hopDistance = 0.5 + Math.random() * 1.0;
                        data.targetX = data.x + Math.cos(angle) * hopDistance;
                        data.targetZ = data.z + Math.sin(angle) * hopDistance;
                        data.rotation = Math.atan2(data.targetZ - data.z, data.targetX - data.x);
                    }
                } else {
                    data.jumpProgress += delta * 2.5;
                    if (data.jumpProgress >= 1) {
                        data.isJumping = false;
                        data.x = data.targetX;
                        data.z = data.targetZ;
                        data.nextHopTime = 2 + Math.random() * 3;
                    } else {
                        const t = data.jumpProgress;
                        data.x = data.x + (data.targetX - data.x) * delta * 2.5; // simple lerp
                        data.z = data.z + (data.targetZ - data.z) * delta * 2.5;
                    }
                }

                const terrainH = getTerrainHeight(data.x, data.z, worldSize, islandRadius);
                const jumpY = data.isJumping ? Math.sin(data.jumpProgress * Math.PI) * 0.4 : 0;
                frog.position.set(data.x, terrainH + 0.1 + jumpY, data.z);
                frog.rotation.y = data.rotation;
            });
        }
    });

    return (
        <group>
            <group ref={fishGroupRef}>
                {fishData.map((data, i) => (
                    <Fish key={i} position={[0, 0, 0]} rotation={0} tailWag={0} phase={data.phase} />
                ))}
            </group>

            <group ref={frogGroupRef}>
                {frogData.map((_, i) => (
                    <Frog key={i} position={[0, 0, 0]} />
                ))}
            </group>
        </group>
    );
};
