
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { LAKES } from '../../utils/constants';
import { getTerrainHeight, getTerrainColor } from '../../utils/terrainUtils';

interface TerrainProps {
    worldSize: number;
    islandRadius: number;
}

// Animated Water Component
const AnimatedWater: React.FC<{ worldSize: number }> = ({ worldSize }) => {
    const waterRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (waterRef.current) {
            const material = waterRef.current.material as THREE.MeshStandardMaterial;
            material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
        }
    });

    return (
        <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -0.2, worldSize / 2]}>
            <planeGeometry args={[worldSize, worldSize]} />
            <meshStandardMaterial
                color="#0ea5e9"
                transparent
                opacity={0.5}
                roughness={0.1}
                metalness={0.4}
            />
        </mesh>
    );
};

export const Terrain: React.FC<TerrainProps> = ({ worldSize, islandRadius }) => {
    const meshRef = useRef<THREE.Mesh>(null);

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

            vertices[i + 2] = h; // Set Z as height (becomes Y after rotation)

            // Calculate Color
            const color = new THREE.Color(getTerrainColor(h));
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
                <meshStandardMaterial vertexColors roughness={1} metalness={0} />
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
                        color="#06b6d4"
                        transparent
                        opacity={0.8}
                        roughness={0}
                        metalness={0.5}
                    />
                </mesh>
            ))}

            <AnimatedWater worldSize={worldSize} />
        </group>
    );
};
