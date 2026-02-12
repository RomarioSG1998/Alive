import React from 'react';

export const Axe: React.FC = () => (
    <group rotation={[1.5, 0, 0]} position={[0, 0.35, 0.05]}>
        {/* Handle */}
        <mesh castShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.02, 0.025, 0.6, 8]} />
            <meshStandardMaterial color="#5D4037" roughness={0.9} />
        </mesh>
        {/* Head */}
        <group position={[0, 0, 0]}>
            <mesh castShadow>
                <boxGeometry args={[0.15, 0.1, 0.03]} /> {/* Wedge block */}
                <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh castShadow position={[0.08, 0, 0]} rotation={[0, 0, -0.2]}>
                <boxGeometry args={[0.06, 0.12, 0.01]} /> {/* Blade edge */}
                <meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.9} />
            </mesh>
        </group>
    </group>
);
