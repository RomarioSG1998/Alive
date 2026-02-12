
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Vector2 } from '../types';
import { PlayerController } from './player/PlayerController';
import { ForestElement } from './world/ForestElement';
import { GrassField } from './world/GrassField';
import { ShakeGroup } from './effects/ShakeGroup';
import { Terrain } from './world/Terrain';
import { useGameStore } from '../store/gameStore';

interface GameWorldProps {
  playerPosition: Vector2;
  worldSize: number;
  islandRadius: number;
  velocity: THREE.Vector2;
  onUpdatePosition: (pos: Vector2, vel: THREE.Vector2) => void;
  onFootstep?: (isWet: boolean) => void;
  keysPressed: React.MutableRefObject<{ [key: string]: boolean }>;
}

export const GameCanvas: React.FC<GameWorldProps> = ({
  playerPosition,
  worldSize,
  islandRadius,
  onUpdatePosition,
  onFootstep,
  keysPressed,
  velocity
}) => {
  const { entities, cameraMode, lastAttack, lastHit } = useGameStore();

  return (
    <div className="absolute inset-0 w-full h-full bg-[#bae6fd]">
      <Canvas shadows gl={{ antialias: true, stencil: false }} dpr={[1, 1.5]}>
        <PerspectiveCamera makeDefault fov={45} position={[0, 50, 50]} />

        <PlayerController
          worldSize={worldSize}
          islandRadius={islandRadius}
          entities={entities}
          onUpdate={onUpdatePosition}
          onFootstep={onFootstep}
          keys={keysPressed}
          mode={cameraMode}
          initialPos={playerPosition}
          lastAttack={lastAttack}
        />

        {/* Lighting & Environment */}
        <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[50, 80, 50]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-60}
          shadow-camera-right={60}
          shadow-camera-top={60}
          shadow-camera-bottom={-60}
        />
        <fog attach="fog" args={['#bae6fd', 40, 140]} />

        {/* World Elements */}
        <group>
          <Terrain worldSize={worldSize} islandRadius={islandRadius} />
          <GrassField islandRadius={islandRadius} worldSize={worldSize} />
        </group>

        {entities.map((ent) => (
          <ShakeGroup key={ent.id} entity={ent} lastHit={lastHit}>
            <ForestElement entity={ent} />
          </ShakeGroup>
        ))}

        <ContactShadows position={[0, 0.05, 0]} resolution={1024} scale={50} blur={2} opacity={0.5} far={10} color="#000000" />
      </Canvas>
    </div>
  );
};
