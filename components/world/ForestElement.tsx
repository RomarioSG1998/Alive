
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Entity, ResourceType } from '../../types';

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

        // Color variations
        const pineColor = Math.random() > 0.5 ? "#166534" : "#14532d"; // Darker greens
        const oakColor = Math.random() > 0.5 ? "#15803d" : "#166534";
        const birchColor = "#4d7c0f";

        return { isPine, isOak, pineColor, oakColor, birchColor };
    }, [entity.pos.x, entity.pos.y]);

    switch (entity.type) {
        case ResourceType.WOOD: {
            if (treeDetails.isPine) {
                // PINE TREE - Improved with better proportions and colors
                return (
                    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
                        {/* Trunk */}
                        <mesh castShadow position={[0, 0.8, 0]}>
                            <cylinderGeometry args={[0.2, 0.35, 1.6, 8]} />
                            <meshStandardMaterial color="#3e2723" roughness={1} />
                        </mesh>
                        {/* Foliage Layers */}
                        <mesh castShadow position={[0, 1.6, 0]}>
                            <coneGeometry args={[1.6, 1.5, 8]} />
                            <meshStandardMaterial color={treeDetails.pineColor} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0, 2.6, 0]}>
                            <coneGeometry args={[1.3, 1.5, 8]} />
                            <meshStandardMaterial color={treeDetails.pineColor} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0, 3.6, 0]}>
                            <coneGeometry args={[1.0, 1.2, 8]} />
                            <meshStandardMaterial color={treeDetails.pineColor} roughness={0.9} />
                        </mesh>
                    </group>
                );
            } else if (treeDetails.isOak) {
                // OAK TREE - Rounder foliage
                return (
                    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
                        {/* Trunk */}
                        <mesh castShadow position={[0, 0.7, 0]}>
                            <cylinderGeometry args={[0.25, 0.35, 1.4, 8]} />
                            <meshStandardMaterial color="#5D4037" roughness={1} />
                        </mesh>
                        {/* Foliage */}
                        <mesh castShadow position={[0, 2.0, 0]}>
                            <dodecahedronGeometry args={[1.4, 0]} />
                            <meshStandardMaterial color={treeDetails.oakColor} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0.8, 1.8, 0]}>
                            <dodecahedronGeometry args={[0.9, 0]} />
                            <meshStandardMaterial color={treeDetails.oakColor} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[-0.7, 1.9, 0.5]}>
                            <dodecahedronGeometry args={[0.8, 0]} />
                            <meshStandardMaterial color={treeDetails.oakColor} roughness={0.9} />
                        </mesh>
                    </group>
                );
            } else {
                // BIRCH TREE - White trunk
                return (
                    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
                        {/* Trunk */}
                        <mesh castShadow position={[0, 1.5, 0]}>
                            <cylinderGeometry args={[0.12, 0.18, 3.0, 8]} />
                            <meshStandardMaterial color="#eef2ff" roughness={0.8} />
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
                            <meshStandardMaterial color={treeDetails.birchColor} roughness={0.9} />
                        </mesh>
                        <mesh castShadow position={[0.4, 3.0, 0.4]}>
                            <dodecahedronGeometry args={[0.8, 0]} />
                            <meshStandardMaterial color={treeDetails.birchColor} roughness={0.9} />
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
            // Generic bush/shrub for other types
            return (
                <group position={pos} rotation={[0, rot, 0]} scale={scale * 0.8}>
                    <mesh castShadow position={[0, 0.5, 0]}>
                        <dodecahedronGeometry args={[0.6, 0]} />
                        <meshStandardMaterial color="#365314" roughness={1} />
                    </mesh>
                    <mesh position={[0, 0.6, 0.3]}>
                        <dodecahedronGeometry args={[0.4, 0]} />
                        <meshStandardMaterial color="#4d7c0f" roughness={1} />
                    </mesh>
                </group>
            );
    }
});
