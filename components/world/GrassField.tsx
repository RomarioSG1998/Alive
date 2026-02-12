import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getTerrainHeight } from '../../utils/terrainUtils';
import { LAKES } from '../../utils/constants';

export const GrassField: React.FC<{ islandRadius: number; worldSize: number }> = ({ islandRadius, worldSize }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 10000;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        if (!meshRef.current) return;
        // Optimization: Disable frustum culling since grass covers the whole island
        // and default bounding sphere is at origin (0,0,0) while instances are offset.
        meshRef.current.frustumCulled = false;

        const color = new THREE.Color();

        for (let i = 0; i < count; i++) {
            // Random position within island
            const angle = Math.random() * Math.PI * 2;
            // Reduce radius to keep grass off the beach (islandRadius - 45)
            const radius = Math.sqrt(Math.random()) * (islandRadius - 45);
            const x = (worldSize / 2) + Math.cos(angle) * radius;
            const z = (worldSize / 2) + Math.sin(angle) * radius;

            // Avoid center (spawn area)
            const distFromCenter = Math.hypot(x - worldSize / 2, z - worldSize / 2);
            if (distFromCenter < 15) {
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

            const y = getTerrainHeight(x, z, worldSize, islandRadius);
            dummy.position.set(x, y + 0.1, z);
            dummy.rotation.y = Math.random() * Math.PI;

            // Scale variation
            const s = 0.6 + Math.random() * 0.6;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // Varied Lush Green Colors
            // Mix between yellow-green and deep forest green
            const h = 0.25 + Math.random() * 0.1; // Hue range 
            const sCol = 0.5 + Math.random() * 0.4; // Saturation
            const l = 0.3 + Math.random() * 0.3; // Lightness
            color.setHSL(h, sCol, l);
            meshRef.current.setColorAt(i, color);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }, [islandRadius, worldSize, dummy]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
            {/* 4 segments for a slightly richer definition than a triangle, but still low poly */}
            <coneGeometry args={[0.06, 0.45, 4]} />
            {/* White base color allows instance colors to show true. High roughness for leafy look. */}
            <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </instancedMesh>
    );
};
