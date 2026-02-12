import React, { useMemo } from 'react';
import * as THREE from 'three';

interface TerrainProps {
    worldSize: number;
    islandRadius: number;
}

// Helper to create procedural noise textures
const generateNoiseTexture = (width: number, height: number, color: string, noiseIntensity: number = 20, scale: number = 1): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Base Color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Noise
    const output = ctx.getImageData(0, 0, width, height);
    const data = output.data;

    // Simple noise generator
    for (let i = 0; i < data.length; i += 4) {
        // Random variation: -intensity to +intensity
        const noise = (Math.random() - 0.5) * noiseIntensity;

        // Add noise to RGB (leave Alpha)
        data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
    }

    ctx.putImageData(output, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(scale, scale);

    return texture;
};

export const Terrain: React.FC<TerrainProps> = ({ worldSize, islandRadius }) => {

    const textures = useMemo(() => {
        return {
            sand: generateNoiseTexture(512, 512, '#d6c68b', 30, 8),
            grassOuter: generateNoiseTexture(512, 512, '#3f6212', 40, 6),
            grassInner: generateNoiseTexture(512, 512, '#166534', 50, 6),
            forest: generateNoiseTexture(512, 512, '#14532d', 60, 4),
            ocean: generateNoiseTexture(512, 512, '#0f172a', 15, 20),
        };
    }, []);

    return (
        <group>
            {/* Deep Ocean Floor (Dark Blue + Noise) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -2, worldSize / 2]}>
                <planeGeometry args={[worldSize, worldSize]} />
                <meshStandardMaterial map={textures.ocean} roughness={0.8} />
            </mesh>

            {/* Island Base / Beach (Sand + Noise) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -0.2, worldSize / 2]}>
                <circleGeometry args={[islandRadius, 64]} />
                <meshStandardMaterial map={textures.sand} roughness={1} />
            </mesh>

            {/* Outer Grass (Darker/Muddy + Noise) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, 0.05, worldSize / 2]}>
                <circleGeometry args={[islandRadius - 40, 64]} />
                <meshStandardMaterial map={textures.grassOuter} roughness={0.9} />
            </mesh>

            {/* Inner Grass (Lush Green + Noise) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, 0.06, worldSize / 2]}>
                <circleGeometry args={[islandRadius - 100, 64]} />
                <meshStandardMaterial map={textures.grassInner} roughness={0.8} />
            </mesh>

            {/* Center Patch (Forest Floor + Noise) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, 0.07, worldSize / 2]}>
                <circleGeometry args={[islandRadius / 2.5, 32]} />
                <meshStandardMaterial map={textures.forest} roughness={1} />
            </mesh>

            {/* LAKES */}
            {/* Lake 1 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2 + 60, 0.08, worldSize / 2 + 40]}>
                <circleGeometry args={[25, 32]} />
                <meshStandardMaterial map={textures.ocean} color="#38bdf8" roughness={0.2} metalness={0.1} />
            </mesh>
            {/* Lake 2 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2 - 50, 0.08, worldSize / 2 + 70]}>
                <circleGeometry args={[18, 32]} />
                <meshStandardMaterial map={textures.ocean} color="#38bdf8" roughness={0.2} metalness={0.1} />
            </mesh>
            {/* Lake 3 - Small Pond */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2 - 80, 0.08, worldSize / 2 - 40]}>
                <circleGeometry args={[12, 32]} />
                <meshStandardMaterial map={textures.ocean} color="#38bdf8" roughness={0.2} metalness={0.1} />
            </mesh>

            {/* Water Surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -0.5, worldSize / 2]}>
                <planeGeometry args={[worldSize, worldSize]} />
                <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} depthWrite={false} roughness={0} metalness={0.5} />
            </mesh>
        </group>
    );
};
