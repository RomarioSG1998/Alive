
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  playerPosition: THREE.Vector3;
  velocity: THREE.Vector2 | { x: number, y: number, length?: () => number } | null | undefined;
  inWater: boolean;
}

export const FootstepParticles: React.FC<ParticleSystemProps> = ({ playerPosition, velocity, inWater }) => {
  const count = 40;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        t: Math.random() * 100, // tempo de vida inicial aleatório
        speed: 0.1 + Math.random() * 0.2,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        scale: 0,
      });
    }
    return temp;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Create a safe default for velocity to prevent any access errors on undefined.
    const safeVelocity = velocity || { x: 0, y: 0, length: () => 0 };
    const speed = safeVelocity.length();
    const isMoving = speed > 10;

    particles.forEach((p, i) => {
      p.t += delta * 2;
      
      // Reset da partícula se ela "morrer"
      if (p.t > 1) {
        if (isMoving) {
          p.t = 0;
          // Spawn um pouco atrás do jogador
          p.pos.copy(playerPosition);
          p.pos.y = inWater ? -0.2 : 0.1;
          
          // Direção aleatória + oposta ao movimento
          const angle = Math.random() * Math.PI * 2;
          const spread = 0.5;
          
          const vx = safeVelocity.x;
          const vy = safeVelocity.y;
          
          p.vel.set(
            Math.cos(angle) * spread - (vx * 0.005),
            inWater ? 1.5 + Math.random() * 2 : 0.5 + Math.random(),
            Math.sin(angle) * spread - (vy * 0.005)
          );
          p.scale = (speed / 300) * (0.5 + Math.random() * 1.5);
        } else {
          p.scale = 0;
        }
      }

      // Física simples
      p.pos.add(p.vel.clone().multiplyScalar(delta));
      if (inWater) {
        p.vel.y -= 9.8 * delta; // Gravidade na água para o "splash"
      } else {
        p.vel.y *= 0.95; // Poeira flutua mais
        p.vel.x *= 0.95;
        p.vel.z *= 0.95;
      }

      const life = 1 - p.t;
      const currentScale = p.scale * life;
      
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(Math.max(0, currentScale));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      
      // Cor baseada no terreno
      if (inWater) {
        color.set('#ffffff').lerp(new THREE.Color('#7dd3fc'), 0.5);
      } else {
        color.set('#d2b48c').lerp(new THREE.Color('#92400e'), 0.3);
      }
      meshRef.current.setColorAt(i, color);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.3, 5, 5]} />
      <meshStandardMaterial 
        transparent 
        opacity={0.6} 
        roughness={1} 
        emissive={inWater ? "#7dd3fc" : "#000000"}
        emissiveIntensity={inWater ? 0.2 : 0}
      />
    </instancedMesh>
  );
};
