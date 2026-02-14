import React from 'react';

export const Rifle: React.FC = () => (
  <group rotation={[1.45, 0, 0.06]} position={[0.02, 0.27, 0.08]}>
    <mesh castShadow position={[0, -0.06, 0]}>
      <boxGeometry args={[0.1, 0.24, 0.08]} />
      <meshStandardMaterial color="#3f2c22" roughness={0.76} metalness={0.1} />
    </mesh>
    <mesh castShadow position={[0, 0.14, -0.24]}>
      <boxGeometry args={[0.08, 0.13, 0.46]} />
      <meshStandardMaterial color="#1f2937" roughness={0.38} metalness={0.72} />
    </mesh>
    <mesh castShadow position={[0, 0.16, -0.52]}>
      <cylinderGeometry args={[0.02, 0.02, 0.56, 12]} />
      <meshStandardMaterial color="#111827" roughness={0.28} metalness={0.82} />
    </mesh>
    <mesh castShadow position={[0, 0.22, -0.18]}>
      <boxGeometry args={[0.05, 0.05, 0.22]} />
      <meshStandardMaterial color="#374151" roughness={0.32} metalness={0.75} />
    </mesh>
    <mesh castShadow position={[0, 0.24, -0.1]}>
      <cylinderGeometry args={[0.018, 0.018, 0.08, 10]} />
      <meshStandardMaterial color="#9ca3af" roughness={0.22} metalness={0.86} />
    </mesh>
  </group>
);
