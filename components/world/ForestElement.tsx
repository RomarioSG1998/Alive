import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Entity, ResourceType } from '../../types';
import { generateNoiseTexture } from '../../utils/textureUtils';

// Pre-compute textures outside component to avoid regeneration on every instance re-render
// In a real app, this should be in a resource manager context
const textures = {
    pineBark: generateNoiseTexture(64, 256, '#3e2723', 30, 2),
    pineLeaves: generateNoiseTexture(256, 256, '#166534', 40, 3),
    oakBark: generateNoiseTexture(64, 256, '#5D4037', 30, 2),
    oakLeaves: generateNoiseTexture(256, 256, '#15803d', 40, 3),
    birchBark: generateNoiseTexture(64, 256, '#f3f4f6', 20, 2), // White-ish with noise
    birchLeaves: generateNoiseTexture(256, 256, '#65a30d', 40, 3),
    stone: generateNoiseTexture(256, 256, '#64748b', 50, 2),
    bush: generateNoiseTexture(128, 128, '#365314', 40, 2),
    fruit: generateNoiseTexture(64, 64, '#e11d48', 20, 1),
};

export const ForestElement: React.FC<{ entity: Entity }> = React.memo(({ entity }) => {
    if (!entity) return null;
    const pos = [entity.pos.x, 0, entity.pos.y] as [number, number, number];
    const scale = entity.size || 1;
    const rot = entity.rotation || 0;

    // Memoize random values to prevent re-renders changing tree appearance
    const treeDetails = useMemo(() => {
        const pseudoRandom = Math.abs(Math.sin(entity.pos.x * 12.9898 + entity.pos.y * 78.233) * 43758.5453) % 1;
        const isPine = pseudoRandom < 0.5;
        const isOak = pseudoRandom >= 0.5 && pseudoRandom < 0.75;

        return { isPine, isOak };
    }, [entity.pos.x, entity.pos.y]);

    switch (entity.type) {
        case ResourceType.WOOD: {
            if (treeDetails.isPine) {
                // PINE TREE
                return (
                    <group rotation={[0, rot, 0]} scale={scale}>
                        {/* Trunk */}
                        <mesh castShadow position={[0, 0.8, 0]}>
                            <cylinderGeometry args={[0.2, 0.35, 1.6, 8]} />
                            <meshStandardMaterial map={textures.pineBark} roughness={1} />
                        </mesh>
                        {/* Foliage Layers */}
                        <mesh castShadow position={[0, 1.6, 0]}>
                            <coneGeometry args={[1.6, 1.5, 8]} />
                            <meshStandardMaterial map={textures.pineLeaves} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0, 2.6, 0]}>
                            <coneGeometry args={[1.3, 1.5, 8]} />
                            <meshStandardMaterial map={textures.pineLeaves} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0, 3.6, 0]}>
                            <coneGeometry args={[1.0, 1.2, 8]} />
                            <meshStandardMaterial map={textures.pineLeaves} roughness={0.9} />
                        </mesh>
                    </group>
                );
            } else if (treeDetails.isOak) {
                // OAK TREE
                return (
                    <group rotation={[0, rot, 0]} scale={scale}>
                        {/* Trunk */}
                        <mesh castShadow position={[0, 0.7, 0]}>
                            <cylinderGeometry args={[0.25, 0.35, 1.4, 8]} />
                            <meshStandardMaterial map={textures.oakBark} roughness={1} />
                        </mesh>
                        {/* Foliage */}
                        <mesh castShadow position={[0, 2.0, 0]}>
                            <dodecahedronGeometry args={[1.4, 0]} />
                            <meshStandardMaterial map={textures.oakLeaves} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0.8, 1.8, 0]}>
                            <dodecahedronGeometry args={[0.9, 0]} />
                            <meshStandardMaterial map={textures.oakLeaves} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[-0.7, 1.9, 0.5]}>
                            <dodecahedronGeometry args={[0.8, 0]} />
                            <meshStandardMaterial map={textures.oakLeaves} roughness={0.9} />
                        </mesh>
                    </group>
                );
            } else {
                // BIRCH TREE - White trunk
                return (
                    <group rotation={[0, rot, 0]} scale={scale}>
                        {/* Trunk */}
                        <mesh castShadow position={[0, 1.5, 0]}>
                            <cylinderGeometry args={[0.12, 0.18, 3.0, 8]} />
                            <meshStandardMaterial map={textures.birchBark} roughness={0.8} />
                        </mesh>
                        {/* Markings */}
                        <mesh position={[0, 0.5, 0]} rotation={[0, 0, 0.1]}>
                            <torusGeometry args={[0.16, 0.02, 4, 8]} />
                            <meshStandardMaterial color="#1f2937" />
                        </mesh>
                        <mesh position={[0, 1.5, 0]} rotation={[0, 0, -0.1]}>
                            <torusGeometry args={[0.14, 0.02, 4, 8]} />
                            <meshStandardMaterial color="#1f2937" />
                        </mesh>
                        {/* Foliage */}
                        <mesh castShadow position={[0, 3.2, 0]}>
                            <dodecahedronGeometry args={[1.1, 0]} />
                            <meshStandardMaterial map={textures.birchLeaves} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0.4, 3.0, 0.4]}>
                            <dodecahedronGeometry args={[0.8, 0]} />
                            <meshStandardMaterial map={textures.birchLeaves} roughness={0.9} />
                        </mesh>
                    </group>
                );
            }
        }
        case ResourceType.STONE:
            return (
                <mesh castShadow position={[0, 0.3 * scale, 0]} scale={scale} rotation={[rot, rot, rot]}>
                    <dodecahedronGeometry args={[0.7, 0]} />
                    <meshStandardMaterial map={textures.stone} roughness={0.9} />
                </mesh>
            );
        case ResourceType.FOOD:
            if ((entity.variant || 0) >= 10) {
                if ((entity.variant || 0) >= 20) {
                    const isBoarCarcass = entity.variant === 21;
                    return (
                        <group rotation={[0, rot, 0]} scale={scale}>
                            <mesh castShadow position={[0, 0.18, 0]} scale={[1.35, 0.45, 0.95]}>
                                <capsuleGeometry args={[0.24, 0.35, 6, 10]} />
                                <meshStandardMaterial color={isBoarCarcass ? "#4b382c" : "#9b6e49"} roughness={1} />
                            </mesh>
                            <mesh castShadow position={[0.48, 0.16, 0]} scale={[0.55, 0.45, 0.55]}>
                                <sphereGeometry args={[0.22, 10, 8]} />
                                <meshStandardMaterial color={isBoarCarcass ? "#3e2f24" : "#835a3d"} roughness={1} />
                            </mesh>
                            {[[-0.2, 0.05, -0.2], [-0.2, 0.05, 0.2], [0.2, 0.05, -0.2], [0.2, 0.05, 0.2]].map((p, i) => (
                                <mesh key={i} castShadow position={[p[0], p[1], p[2]]} rotation={[0.15, 0, 0.9]}>
                                    <cylinderGeometry args={[0.03, 0.04, 0.22]} />
                                    <meshStandardMaterial color="#2f241c" roughness={1} />
                                </mesh>
                            ))}
                        </group>
                    );
                }
                const isBoar = entity.variant === 11;
                return (
                    <group rotation={[0, rot, 0]} scale={scale}>
                        {isBoar ? (
                            <>
                                {/* Boar body */}
                                <mesh castShadow position={[0, 0.38, 0]} scale={[1.4, 0.9, 0.8]}>
                                    <capsuleGeometry args={[0.26, 0.45, 6, 10]} />
                                    <meshStandardMaterial color="#5b4635" roughness={0.95} />
                                </mesh>
                                <mesh castShadow position={[0.42, 0.42, 0]} scale={[0.9, 0.75, 0.75]}>
                                    <sphereGeometry args={[0.22, 12, 10]} />
                                    <meshStandardMaterial color="#4a3729" roughness={0.95} />
                                </mesh>
                                <mesh castShadow position={[0.6, 0.36, 0]} scale={[0.42, 0.32, 0.32]}>
                                    <sphereGeometry args={[0.2, 10, 8]} />
                                    <meshStandardMaterial color="#8d6e63" roughness={0.9} />
                                </mesh>
                                <mesh castShadow position={[0.67, 0.37, 0.08]} rotation={[0, 0, 0.2]}>
                                    <coneGeometry args={[0.02, 0.09, 4]} />
                                    <meshStandardMaterial color="#f5f5f4" />
                                </mesh>
                                <mesh castShadow position={[0.67, 0.37, -0.08]} rotation={[0, 0, 0.2]}>
                                    <coneGeometry args={[0.02, 0.09, 4]} />
                                    <meshStandardMaterial color="#f5f5f4" />
                                </mesh>
                            </>
                        ) : (
                            <>
                                {/* Deer body */}
                                <mesh castShadow position={[0, 0.44, 0]} scale={[1.45, 0.85, 0.72]}>
                                    <capsuleGeometry args={[0.22, 0.55, 6, 10]} />
                                    <meshStandardMaterial color="#b07a4f" roughness={0.9} />
                                </mesh>
                                <mesh castShadow position={[0.52, 0.58, 0]} scale={[0.8, 0.78, 0.7]}>
                                    <sphereGeometry args={[0.2, 12, 10]} />
                                    <meshStandardMaterial color="#a36f46" roughness={0.9} />
                                </mesh>
                                <mesh castShadow position={[0.63, 0.82, 0.07]} rotation={[0.2, 0, 0]}>
                                    <boxGeometry args={[0.03, 0.18, 0.03]} />
                                    <meshStandardMaterial color="#f3e5ab" />
                                </mesh>
                                <mesh castShadow position={[0.63, 0.82, -0.07]} rotation={[0.2, 0, 0]}>
                                    <boxGeometry args={[0.03, 0.18, 0.03]} />
                                    <meshStandardMaterial color="#f3e5ab" />
                                </mesh>
                            </>
                        )}
                        {/* Legs */}
                        {[[-0.35, 0.15, -0.16], [-0.35, 0.15, 0.16], [0.18, 0.15, -0.16], [0.18, 0.15, 0.16]].map((p, i) => (
                            <mesh key={i} castShadow position={[p[0], p[1], p[2]]}>
                                <cylinderGeometry args={[0.04, 0.045, 0.32]} />
                                <meshStandardMaterial color={isBoar ? "#3f2f24" : "#8b5e3c"} roughness={0.95} />
                            </mesh>
                        ))}
                    </group>
                );
            }
            return (
                <group scale={scale}>
                    <mesh castShadow position={[0, 0.4, 0]}>
                        <sphereGeometry args={[0.2, 8, 8]} />
                        <meshStandardMaterial map={textures.fruit} />
                    </mesh>
                    <mesh position={[0, 0.1, 0]}>
                        <cylinderGeometry args={[0.05, 0.05, 0.4]} />
                        <meshStandardMaterial color="#166534" />
                    </mesh>
                </group>
            );
        default:
            // Generic bush
            return (
                <group rotation={[0, rot, 0]} scale={scale * 0.8}>
                    <mesh castShadow position={[0, 0.5, 0]}>
                        <dodecahedronGeometry args={[0.6, 0]} />
                        <meshStandardMaterial map={textures.bush} roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.6, 0.3]}>
                        <dodecahedronGeometry args={[0.4, 0]} />
                        <meshStandardMaterial map={textures.bush} roughness={1} />
                    </mesh>
                </group>
            );
    }
});
