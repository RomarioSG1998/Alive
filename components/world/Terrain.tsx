
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LAKES } from '../../utils/constants';
import { getTerrainHeight, getTerrainColor } from '../../utils/terrainUtils';
import { generateNoiseTexture } from '../../utils/textureUtils';

interface TerrainProps {
    worldSize: number;
    islandRadius: number;
}

// Animated Water Component
const AnimatedWater: React.FC<{ worldSize: number }> = ({ worldSize }) => {
    const waterRef = useRef<THREE.Mesh>(null);
    const waterTexture = useMemo(() => {
        const tex = generateNoiseTexture(512, 512, '#3b82f6', 28, 40);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }, []);

    useFrame((state) => {
        if (waterRef.current) {
            const material = waterRef.current.material as THREE.MeshStandardMaterial;
            material.opacity = 0.54 + Math.sin(state.clock.elapsedTime * 0.35) * 0.04;
            if (material.normalMap) {
                material.normalMap.offset.x = state.clock.elapsedTime * 0.004;
                material.normalMap.offset.y = state.clock.elapsedTime * 0.002;
            }
        }
    });

    return (
        <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -0.2, worldSize / 2]}>
            <planeGeometry args={[worldSize, worldSize]} />
            <meshStandardMaterial
                color="#2c7fb8"
                transparent
                opacity={0.54}
                roughness={0.25}
                metalness={0.2}
                normalMap={waterTexture}
                normalScale={new THREE.Vector2(0.22, 0.22)}
            />
        </mesh>
    );
};

export const Terrain: React.FC<TerrainProps> = ({ worldSize, islandRadius }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialMaps = useMemo(() => {
        const roughMap = generateNoiseTexture(1024, 1024, '#808080', 42, 26);
        return { roughMap };
    }, []);

    const { geometry, colors } = useMemo(() => {
        // High resolution for smooth relief
        const segments = 120;
        const geo = new THREE.PlaneGeometry(worldSize, worldSize, segments, segments);
        const vertices = geo.attributes.position.array;
        const colorAttr = new Float32Array(vertices.length);

        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + worldSize / 2;
            const z = worldSize / 2 - vertices[i + 1]; // PlaneGeometry space to world space

            // Get height from utility (now includes lake carving)
            const h = getTerrainHeight(x, z, worldSize, islandRadius);
            const hX1 = getTerrainHeight(x + 2.2, z, worldSize, islandRadius);
            const hX2 = getTerrainHeight(x - 2.2, z, worldSize, islandRadius);
            const hZ1 = getTerrainHeight(x, z + 2.2, worldSize, islandRadius);
            const hZ2 = getTerrainHeight(x, z - 2.2, worldSize, islandRadius);
            const slope = THREE.MathUtils.clamp(
                Math.hypot((hX1 - hX2) * 0.24, (hZ1 - hZ2) * 0.24),
                0,
                1
            );
            const variation = (Math.sin(x * 0.013) + Math.cos(z * 0.017)) * 0.12;

            vertices[i + 2] = h; // Set Z as height (becomes Y after rotation)

            // Calculate Color
            const color = new THREE.Color(getTerrainColor(h, slope, variation));
            colorAttr[i] = color.r;
            colorAttr[i + 1] = color.g;
            colorAttr[i + 2] = color.b;
        }

        geo.computeVertexNormals();
        return { geometry: geo, colors: colorAttr };
    }, [worldSize, islandRadius]);

    return (
        <group>
            {/* Main Island Mesh */}
            <mesh
                name="islandTerrain"
                rotation={[-Math.PI / 2, 0, 0]}
                position={[worldSize / 2, 0, worldSize / 2]}
                receiveShadow
                castShadow
            >
                <primitive object={geometry} attach="geometry">
                    <bufferAttribute
                        attach="attributes-color"
                        count={colors.length / 3}
                        array={colors}
                        itemSize={3}
                    />
                </primitive>
                <meshStandardMaterial
                    vertexColors
                    roughnessMap={materialMaps.roughMap}
                    bumpMap={materialMaps.roughMap}
                    bumpScale={0.03}
                    roughness={0.9}
                    metalness={0.03}
                />
            </mesh>

            {/* LAKE WATER - Fixed slightly below land level (0) */}
            {LAKES.map((lake, i) => (
                <mesh
                    key={i}
                    rotation={[-Math.PI / 2, 0, 0]}
                    receiveShadow
                    position={[worldSize / 2 + lake.x, -0.15, worldSize / 2 + lake.z]}
                >
                    <circleGeometry args={[lake.r, 32]} />
                    <meshStandardMaterial
                        color="#3b82a0"
                        transparent
                        opacity={0.7}
                        roughness={0.18}
                        metalness={0.15}
                    />
                </mesh>
            ))}

            <AnimatedWater worldSize={worldSize} />
        </group>
    );
};
