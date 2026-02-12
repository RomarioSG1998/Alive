
import React from 'react';
import * as THREE from 'three';

interface TerrainProps {
    worldSize: number;
    islandRadius: number;
}

export const Terrain: React.FC<TerrainProps> = ({ worldSize, islandRadius }) => {
    return (
        <group>
            {/* Deep Ocean Floor (Dark Blue) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -2, worldSize / 2]}>
                <planeGeometry args={[worldSize, worldSize]} />
                <meshStandardMaterial color="#0f172a" roughness={1} />
            </mesh>

            {/* Island Base / Beach (Sand Color) */}
            {/* Extends slightly beyond the grass to create a shoreline */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -0.2, worldSize / 2]}>
                <circleGeometry args={[islandRadius, 64]} />
                <meshStandardMaterial color="#d6c68b" roughness={1} />
            </mesh>

            {/* Outer Grass (Darker/Muddy) - Starts 40 units in to leave a beach */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, 0.05, worldSize / 2]}>
                <circleGeometry args={[islandRadius - 40, 64]} />
                <meshStandardMaterial color="#3f6212" roughness={1} />
            </mesh>

            {/* Inner Grass (Lush Green) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, 0.06, worldSize / 2]}>
                <circleGeometry args={[islandRadius - 100, 64]} />
                <meshStandardMaterial color="#166534" roughness={1} />
            </mesh>

            {/* Center Patch (Different soil/forest floor) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, 0.07, worldSize / 2]}>
                <circleGeometry args={[islandRadius / 2.5, 32]} />
                <meshStandardMaterial color="#14532d" roughness={1} />
            </mesh>

            {/* Water Surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[worldSize / 2, -0.5, worldSize / 2]}>
                <planeGeometry args={[worldSize, worldSize]} />
                <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} depthWrite={false} roughness={0} metalness={0.5} />
            </mesh>
        </group>
    );
};
