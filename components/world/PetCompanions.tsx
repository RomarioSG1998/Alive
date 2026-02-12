import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Vector2 } from '../../types';
import { getTerrainHeight } from '../../utils/terrainUtils';

interface PetCompanionsProps {
    playerPosition: Vector2;
    playerVelocity: THREE.Vector2;
    worldSize: number;
    islandRadius: number;
}

const CatModel: React.FC<{ anim: React.MutableRefObject<number> }> = ({ anim }) => {
    const tailRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (tailRef.current) {
            tailRef.current.rotation.y = Math.sin(t * 5.2) * 0.45;
            tailRef.current.rotation.z = 0.55 + Math.sin(t * 2.8) * 0.08;
        }
        if (headRef.current) {
            headRef.current.position.y = 0.34 + Math.sin(t * 8 + anim.current) * 0.01;
        }
    });

    return (
        <group scale={0.95}>
            <mesh castShadow position={[0, 0.26, 0]} scale={[1.15, 0.8, 0.7]}>
                <capsuleGeometry args={[0.18, 0.32, 6, 10]} />
                <meshStandardMaterial color="#f0cb92" roughness={0.86} />
            </mesh>
            <group ref={headRef} position={[0.26, 0.34, 0]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.15, 12, 12]} />
                    <meshStandardMaterial color="#f0cb92" roughness={0.82} />
                </mesh>
                <mesh castShadow position={[0.03, 0.13, 0.085]} rotation={[0, 0, 0.22]}>
                    <coneGeometry args={[0.055, 0.1, 3]} />
                    <meshStandardMaterial color="#e0b676" roughness={0.8} />
                </mesh>
                <mesh castShadow position={[0.03, 0.13, -0.085]} rotation={[0, 0, 0.22]}>
                    <coneGeometry args={[0.055, 0.1, 3]} />
                    <meshStandardMaterial color="#e0b676" roughness={0.8} />
                </mesh>
                <mesh position={[0.13, -0.02, 0]}>
                    <sphereGeometry args={[0.025, 8, 8]} />
                    <meshStandardMaterial color="#111827" roughness={0.5} />
                </mesh>
            </group>
            <group ref={tailRef} position={[-0.29, 0.36, 0]} rotation={[0, 0, 0.55]}>
                <mesh castShadow>
                    <capsuleGeometry args={[0.04, 0.36, 4, 8]} />
                    <meshStandardMaterial color="#f0cb92" roughness={0.85} />
                </mesh>
            </group>
        </group>
    );
};

const DogModel: React.FC<{ anim: React.MutableRefObject<number> }> = ({ anim }) => {
    const tailRef = useRef<THREE.Group>(null);
    const earLRef = useRef<THREE.Mesh>(null);
    const earRRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        if (tailRef.current) {
            tailRef.current.rotation.y = Math.sin(t * 9 + anim.current) * 0.55;
            tailRef.current.rotation.z = 0.45;
        }
        if (earLRef.current) earLRef.current.rotation.x = -0.2 + Math.sin(t * 7.5) * 0.04;
        if (earRRef.current) earRRef.current.rotation.x = 0.2 - Math.sin(t * 7.5) * 0.04;
    });

    return (
        <group scale={1.08}>
            <mesh castShadow position={[0, 0.3, 0]} scale={[1.2, 0.9, 0.78]}>
                <capsuleGeometry args={[0.2, 0.36, 6, 10]} />
                <meshStandardMaterial color="#b97a45" roughness={0.88} />
            </mesh>
            <group position={[0.3, 0.36, 0]}>
                <mesh castShadow>
                    <sphereGeometry args={[0.17, 12, 12]} />
                    <meshStandardMaterial color="#a96a36" roughness={0.86} />
                </mesh>
                <mesh ref={earLRef} castShadow position={[0.02, 0.12, 0.11]} rotation={[-0.2, 0, 0.35]}>
                    <boxGeometry args={[0.06, 0.16, 0.04]} />
                    <meshStandardMaterial color="#7a4b27" roughness={0.9} />
                </mesh>
                <mesh ref={earRRef} castShadow position={[0.02, 0.12, -0.11]} rotation={[0.2, 0, 0.35]}>
                    <boxGeometry args={[0.06, 0.16, 0.04]} />
                    <meshStandardMaterial color="#7a4b27" roughness={0.9} />
                </mesh>
                <mesh position={[0.14, -0.01, 0]}>
                    <sphereGeometry args={[0.03, 8, 8]} />
                    <meshStandardMaterial color="#111827" roughness={0.5} />
                </mesh>
            </group>
            <group ref={tailRef} position={[-0.33, 0.36, 0]} rotation={[0, 0, 0.45]}>
                <mesh castShadow>
                    <capsuleGeometry args={[0.045, 0.28, 4, 8]} />
                    <meshStandardMaterial color="#b97a45" roughness={0.88} />
                </mesh>
            </group>
        </group>
    );
};

export const PetCompanions: React.FC<PetCompanionsProps> = ({
    playerPosition,
    playerVelocity,
    worldSize,
    islandRadius
}) => {
    const catRef = useRef<THREE.Group>(null);
    const dogRef = useRef<THREE.Group>(null);
    const catAnimRef = useRef(Math.random() * Math.PI * 2);
    const dogAnimRef = useRef(Math.random() * Math.PI * 2);
    const initRef = useRef(false);

    const basis = useMemo(() => ({
        forward: new THREE.Vector2(0, 1),
        right: new THREE.Vector2(1, 0)
    }), []);

    const getCabinSupportHeight = (x: number, z: number, currentY: number): number | null => {
        const cabinX = worldSize / 2 + 100;
        const cabinZ = worldSize / 2 - 80;
        const baseY = getTerrainHeight(cabinX, cabinZ, worldSize, islandRadius);
        const localX = x - cabinX;
        const localZ = z - cabinZ;

        const groundFloorY = baseY + 0.05;
        const secondFloorY = baseY + 6.72;

        const insideGroundFloor = Math.abs(localX) < 5.8 && Math.abs(localZ) < 4.8;

        const stairStartZ = 4.2;
        const stairEndZ = -5.0;
        const stairRun = stairStartZ - stairEndZ;
        const onStair = localX > 6.2 && localX < 7.8 && localZ < stairStartZ + 0.25 && localZ > stairEndZ - 0.35;
        let stairProgress = 0;
        let stairY = -Infinity;
        if (onStair) {
            stairProgress = THREE.MathUtils.clamp((stairStartZ - localZ) / stairRun, 0, 1);
            stairY = THREE.MathUtils.lerp(groundFloorY, secondFloorY, stairProgress);
        }

        const onUpperLanding = localX > 4.4 && localX < 6.9 && localZ > -5.4 && localZ < -3.7;
        const insideUpperFloor = Math.abs(localX) < 5.4 && Math.abs(localZ) < 4.6;
        const canUseUpperFloor = currentY > baseY + 3.0 || stairProgress > 0.76 || onUpperLanding;
        const upperY = canUseUpperFloor && (insideUpperFloor || onUpperLanding) ? secondFloorY : -Infinity;

        const groundY = insideGroundFloor ? groundFloorY : -Infinity;
        const supportY = Math.max(groundY, stairY, upperY);
        return Number.isFinite(supportY) ? supportY : null;
    };

    useFrame((state, delta) => {
        const cat = catRef.current;
        const dog = dogRef.current;
        if (!cat || !dog) return;

        const speed = playerVelocity.length();
        const t = state.clock.elapsedTime;

        // Use movement direction when available; fallback to camera-ish forward.
        if (speed > 0.08) {
            basis.forward.set(playerVelocity.x, playerVelocity.y).normalize();
            basis.right.set(-basis.forward.y, basis.forward.x).normalize();
        }

        const playerX = playerPosition.x;
        const playerZ = playerPosition.y;

        if (!initRef.current) {
            const catY = getTerrainHeight(playerX - 1.2, playerZ - 1.1, worldSize, islandRadius);
            const dogY = getTerrainHeight(playerX + 1.5, playerZ - 1.3, worldSize, islandRadius);
            cat.position.set(playerX - 1.2, catY, playerZ - 1.1);
            dog.position.set(playerX + 1.5, dogY, playerZ - 1.3);
            initRef.current = true;
        }

        const catOffsetF = -1.7 + Math.sin(t * 0.8) * 0.3;
        const catOffsetR = -1.2 + Math.cos(t * 0.65) * 0.25;
        const dogOffsetF = -2.0 + Math.sin(t * 0.6 + 1.2) * 0.35;
        const dogOffsetR = 1.35 + Math.cos(t * 0.5 + 0.9) * 0.25;

        let catTargetX = playerX + basis.forward.x * catOffsetF + basis.right.x * catOffsetR;
        let catTargetZ = playerZ + basis.forward.y * catOffsetF + basis.right.y * catOffsetR;
        let dogTargetX = playerX + basis.forward.x * dogOffsetF + basis.right.x * dogOffsetR;
        let dogTargetZ = playerZ + basis.forward.y * dogOffsetF + basis.right.y * dogOffsetR;

        // Dog is playful: small orbit around target offset.
        dogTargetX += Math.cos(t * 1.6 + dogAnimRef.current) * 0.45;
        dogTargetZ += Math.sin(t * 1.6 + dogAnimRef.current) * 0.45;
        // Cat is cautious: smoother smaller weave.
        catTargetX += Math.sin(t * 0.9 + catAnimRef.current) * 0.18;
        catTargetZ += Math.cos(t * 0.8 + catAnimRef.current) * 0.18;

        const catTerrainY = getTerrainHeight(catTargetX, catTargetZ, worldSize, islandRadius) + 0.02;
        const dogTerrainY = getTerrainHeight(dogTargetX, dogTargetZ, worldSize, islandRadius) + 0.02;
        const catCabinY = getCabinSupportHeight(catTargetX, catTargetZ, cat.position.y);
        const dogCabinY = getCabinSupportHeight(dogTargetX, dogTargetZ, dog.position.y);
        const catTargetY = Math.max(catTerrainY, catCabinY ?? -Infinity);
        const dogTargetY = Math.max(dogTerrainY, dogCabinY ?? -Infinity);

        // Keep pets from overlapping each other.
        const petSepX = dogTargetX - catTargetX;
        const petSepZ = dogTargetZ - catTargetZ;
        const petSep = Math.hypot(petSepX, petSepZ);
        if (petSep < 1.25 && petSep > 0.0001) {
            const push = (1.25 - petSep) * 0.5;
            const nx = petSepX / petSep;
            const nz = petSepZ / petSep;
            catTargetX -= nx * push;
            catTargetZ -= nz * push;
            dogTargetX += nx * push;
            dogTargetZ += nz * push;
        }

        const catDistToPlayer = Math.hypot(cat.position.x - playerX, cat.position.z - playerZ);
        const dogDistToPlayer = Math.hypot(dog.position.x - playerX, dog.position.z - playerZ);
        const catLerp = speed > 0.2 ? 0.13 : (catDistToPlayer < 2.2 ? 0.05 : 0.08);
        const dogLerp = speed > 0.2 ? 0.16 : (dogDistToPlayer < 2.0 ? 0.06 : 0.09);

        cat.position.lerp(new THREE.Vector3(catTargetX, catTargetY, catTargetZ), catLerp);
        dog.position.lerp(new THREE.Vector3(dogTargetX, dogTargetY, dogTargetZ), dogLerp);

        // Snap if too far (teleport correction after long jumps / spawns)
        const catDist = Math.hypot(cat.position.x - playerX, cat.position.z - playerZ);
        if (catDist > 16) {
            cat.position.set(catTargetX, catTargetY, catTargetZ);
        }
        const dogDist = Math.hypot(dog.position.x - playerX, dog.position.z - playerZ);
        if (dogDist > 16) {
            dog.position.set(dogTargetX, dogTargetY, dogTargetZ);
        }

        const catMoveX = catTargetX - cat.position.x;
        const catMoveZ = catTargetZ - cat.position.z;
        const dogMoveX = dogTargetX - dog.position.x;
        const dogMoveZ = dogTargetZ - dog.position.z;
        const catMoveLen = Math.hypot(catMoveX, catMoveZ);
        const dogMoveLen = Math.hypot(dogMoveX, dogMoveZ);
        const catDir = catMoveLen > 0.05 ? Math.atan2(catMoveX, catMoveZ) : Math.atan2(playerX - cat.position.x, playerZ - cat.position.z);
        const dogDir = dogMoveLen > 0.05 ? Math.atan2(dogMoveX, dogMoveZ) : Math.atan2(playerX - dog.position.x, playerZ - dog.position.z);
        cat.rotation.y = THREE.MathUtils.lerp(cat.rotation.y, catDir, 0.16);
        dog.rotation.y = THREE.MathUtils.lerp(dog.rotation.y, dogDir, 0.2);

        // Subtle idle bob.
        cat.position.y += Math.sin(t * 4.6 + catAnimRef.current) * 0.001 * (speed > 0.2 ? 0.35 : 1);
        dog.position.y += Math.cos(t * 4.2 + dogAnimRef.current) * 0.0011 * (speed > 0.2 ? 0.35 : 1);

        // Keep pets inside world bounds and outside the cabin collision volume.
        cat.position.x = THREE.MathUtils.clamp(cat.position.x, 0, worldSize);
        cat.position.z = THREE.MathUtils.clamp(cat.position.z, 0, worldSize);
        dog.position.x = THREE.MathUtils.clamp(dog.position.x, 0, worldSize);
        dog.position.z = THREE.MathUtils.clamp(dog.position.z, 0, worldSize);

        const catCurrentTerrainY = getTerrainHeight(cat.position.x, cat.position.z, worldSize, islandRadius) + 0.02;
        const dogCurrentTerrainY = getTerrainHeight(dog.position.x, dog.position.z, worldSize, islandRadius) + 0.02;
        const catCurrentCabinY = getCabinSupportHeight(cat.position.x, cat.position.z, cat.position.y);
        const dogCurrentCabinY = getCabinSupportHeight(dog.position.x, dog.position.z, dog.position.y);
        cat.position.y = Math.max(cat.position.y, catCurrentTerrainY, catCurrentCabinY ?? -Infinity);
        dog.position.y = Math.max(dog.position.y, dogCurrentTerrainY, dogCurrentCabinY ?? -Infinity);
    });

    return (
        <group>
            <group ref={catRef}>
                <CatModel anim={catAnimRef} />
            </group>
            <group ref={dogRef}>
                <DogModel anim={dogAnimRef} />
            </group>
        </group>
    );
};
