import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Entity } from '../../types';

interface ShakeGroupProps {
    entity: Entity;
    lastHit?: { id: string; time: number } | null;
    children: React.ReactNode;
}

export const ShakeGroup: React.FC<ShakeGroupProps> = ({ entity, lastHit, children }) => {
    const groupRef = useRef<THREE.Group>(null);
    useFrame(() => {
        if (lastHit && lastHit.id === entity.id) {
            const timeSinceHit = Date.now() - lastHit.time;
            if (timeSinceHit < 250) {
                const intensity = 0.1 * (1 - timeSinceHit / 250);
                if (groupRef.current) {
                    groupRef.current.rotation.z = Math.sin(timeSinceHit * 0.1) * intensity;
                    groupRef.current.rotation.x = Math.cos(timeSinceHit * 0.1) * intensity;
                }
            } else {
                if (groupRef.current) {
                    groupRef.current.rotation.z = 0;
                    groupRef.current.rotation.x = 0;
                }
            }
        }
    });
    return <group ref={groupRef}>{children}</group>;
};
