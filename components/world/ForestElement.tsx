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
                    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
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
                    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
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
                    <group position={pos} rotation={[0, rot, 0]} scale={scale}>
                        {/* Trunk */}
                        <mesh castShadow position={[0, 1.5, 0]}>
                            <cylinderGeometry args={[0.12, 0.18, 3.0, 8]} />
                            <meshStandardMaterial map={textures.birchBark} roughness={0.8} />
                        </mesh>
                        {/* Markings - Keep dark, no texture needed for small torus */}
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
                <mesh castShadow position={[entity.pos.x, 0.3 * scale, entity.pos.y]} scale={scale} rotation={[rot, rot, rot]}>
                    <dodecahedronGeometry args={[0.7, 0]} />
                    <meshStandardMaterial map={textures.stone} roughness={0.9} />
                </mesh>
            );
        case ResourceType.FOOD:
            return (
                <group position={[entity.pos.x, 0, entity.pos.y]} scale={scale}>
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
            // Generic bush/shrub for other types
            return (
                <group position={pos} rotation={[0, rot, 0]} scale={scale * 0.8}>
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
