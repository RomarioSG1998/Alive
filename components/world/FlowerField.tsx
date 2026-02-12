import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { LAKES } from '../../utils/constants';
import { getTerrainHeight } from '../../utils/terrainUtils';

export const FlowerField: React.FC<{ islandRadius: number; worldSize: number }> = ({ islandRadius, worldSize }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 3000; // Lower count than grass, but enough to be visible
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        if (!meshRef.current) return;
        meshRef.current.frustumCulled = false;

        const color = new THREE.Color();
        // Palette: Red, Yellow, Purple, White, Pink
        const palette = [0xff0000, 0xffff00, 0xa855f7, 0xffffff, 0xec4899];

        for (let i = 0; i < count; i++) {
            // Random position within island
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.sqrt(Math.random()) * (islandRadius - 50); // Keep slightly inward from beach
            const x = (worldSize / 2) + Math.cos(angle) * radius;
            const z = (worldSize / 2) + Math.sin(angle) * radius;

            // Avoid center (spawn area)
            const distFromCenter = Math.hypot(x - worldSize / 2, z - worldSize / 2);
            if (distFromCenter < 20) {
                i--;
                continue;
            }

            // Avoid Lakes
            let inLake = false;
            for (const lake of LAKES) {
                const dist = Math.hypot(x - (worldSize / 2 + lake.x), z - (worldSize / 2 + lake.z));
                if (dist < lake.r + 1) {
                    inLake = true;
                    break;
                }
            }
            if (inLake) {
                i--;
                continue;
            }

            // Avoid Cabin Interior
            const cabinX = worldSize / 2 + 100;
            const cabinZ = worldSize / 2 - 80;
            if (Math.abs(x - cabinX) < 6.5 && Math.abs(z - cabinZ) < 5.5) {
                i--;
                continue;
            }

            const sampleR = 0.55;
            const hCenter = getTerrainHeight(x, z, worldSize, islandRadius);
            const hX1 = getTerrainHeight(x + sampleR, z, worldSize, islandRadius);
            const hX2 = getTerrainHeight(x - sampleR, z, worldSize, islandRadius);
            const hZ1 = getTerrainHeight(x, z + sampleR, worldSize, islandRadius);
            const hZ2 = getTerrainHeight(x, z - sampleR, worldSize, islandRadius);
            const baseY = Math.min(hCenter, hX1, hX2, hZ1, hZ2);
            const mountainSink = THREE.MathUtils.smoothstep(hCenter, 8, 28) * 0.14;
            dummy.position.set(x, baseY - 0.03 - mountainSink, z);
            dummy.rotation.y = Math.random() * Math.PI;
            dummy.rotation.x = (Math.random() - 0.5) * 0.2; // Slight tilt
            dummy.rotation.z = (Math.random() - 0.5) * 0.2;

            const s = 0.5 + Math.random() * 0.5;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // Random color from palette
            const hex = palette[Math.floor(Math.random() * palette.length)];
            color.setHex(hex);
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [islandRadius, worldSize, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
            {/* Simple Flower Shape: A small sphere sitting on top of a thin cylinder (stem is implicit or simplified) */}
            {/* Using a Dodecahedron for low-poly petal look */}
            <dodecahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial roughness={0.42} metalness={0.02} />
        </instancedMesh>
    );
};
