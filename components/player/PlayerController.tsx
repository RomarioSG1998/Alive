import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { AimState, AvatarType, CameraMode, Entity, ResourceType, Vector2, WorldPosition } from '../../types';
import { Avatar } from './Avatar';
import { FootstepParticles } from '../effects/VFX';
import { getTerrainHeight, getIslandBoundary } from '../../utils/terrainUtils';
import { LAKES } from '../../utils/constants';

const lerpAngle = (start: number, end: number, t: number) => {
    const shortestAngle = ((((end - start) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return start + shortestAngle * t;
};

interface PlayerControllerProps {
    worldSize: number;
    islandRadius: number;
    entities: Entity[];
    onUpdate: (pos: Vector2, vel: THREE.Vector2) => void;
    onFootstep?: (isWet: boolean) => void;
    keys: React.MutableRefObject<{ [key: string]: boolean }>;
    mode: CameraMode;
    initialPos: Vector2;
    lastAttack?: number;
    avatarType?: AvatarType;
    isSitting: boolean;
    seatPosition: WorldPosition;
    seatYaw: number;
    onAimUpdate?: (aim: AimState) => void;
}

export const PlayerController: React.FC<PlayerControllerProps> = ({
    worldSize,
    islandRadius,
    entities,
    onUpdate,
    onFootstep,
    keys,
    mode,
    initialPos,
    lastAttack,
    avatarType = 'gemini',
    isSitting,
    seatPosition,
    seatYaw,
    onAimUpdate
}) => {
    const { camera } = useThree();
    const playerRef = useRef<THREE.Group>(null);
    const internalVel = useRef(new THREE.Vector2(0, 0));
    const raycasterRef = useRef(new THREE.Raycaster());
    const walkTime = useRef(0);
    const lastStateSync = useRef(0);
    const lastFootIndex = useRef(-1);
    const initialized = useRef(false);

    useEffect(() => {
        if (playerRef.current && !initialized.current) {
            const startY = getTerrainHeight(initialPos.x, initialPos.y, worldSize, islandRadius);
            playerRef.current.position.set(initialPos.x, startY, initialPos.y);
            initialized.current = true;
        }
    }, [initialPos, worldSize, islandRadius]);

    const cameraRotation = useRef({ x: 0.3, y: Math.PI }); // x=pitch, y=yaw

    const getCabinSupportHeight = (x: number, z: number, currentY: number): number | null => {
        const cabinX = worldSize / 2 + 100;
        const cabinZ = worldSize / 2 - 80;
        const baseY = getTerrainHeight(cabinX, cabinZ, worldSize, islandRadius);

        const localX = x - cabinX;
        const localZ = z - cabinZ;

        const secondFloorY = baseY + 6.72;
        const stairBottomY = baseY + 0.12;

        const stairStartZ = 4.2;
        const stairEndZ = -5.0;
        const stairRun = stairStartZ - stairEndZ;

        const onStair = localX > 6.2 && localX < 7.8 && localZ < stairStartZ + 0.25 && localZ > stairEndZ - 0.35;
        let stairProgress = 0;
        let stairY = -Infinity;

        if (onStair) {
            stairProgress = THREE.MathUtils.clamp((stairStartZ - localZ) / stairRun, 0, 1);
            stairY = THREE.MathUtils.lerp(stairBottomY, secondFloorY, stairProgress);
        }

        const onUpperLanding = localX > 4.4 && localX < 6.9 && localZ > -5.4 && localZ < -3.7;
        const insideUpperFloor = Math.abs(localX) < 5.4 && Math.abs(localZ) < 4.6;
        const canUseUpperFloor = currentY > baseY + 3.2 || stairProgress > 0.82 || onUpperLanding;
        const upperY = canUseUpperFloor && (insideUpperFloor || onUpperLanding) ? secondFloorY : -Infinity;

        const supportY = Math.max(stairY, upperY);
        return Number.isFinite(supportY) ? supportY : null;
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === document.body) {
                cameraRotation.current.y -= e.movementX * 0.003;
                cameraRotation.current.x -= e.movementY * 0.004;
                // Constraints to prevent looking at feet or under character
                // Max 1.0 (looking down), Min -1.2 (looking up)
                cameraRotation.current.x = Math.max(-1.2, Math.min(1.0, cameraRotation.current.x));
            }
        };
        const onClick = () => document.body.requestPointerLock();

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('click', onClick);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('click', onClick);
        };
    }, []);

    useFrame((state, delta) => {
        if (!playerRef.current || !internalVel.current) return;

        const d = Math.min(delta, 0.1);
        const pPos = playerRef.current.position;
        const lakeSurfaceY = -0.15;
        const isRunning = !isSitting && (
            keys.current['ShiftLeft'] ||
            keys.current['ShiftRight'] ||
            keys.current['ControlLeft'] ||
            keys.current['ControlRight'] ||
            keys.current['Control'] ||
            keys.current['Ctrl']
        );

        const distFromCenter = Math.hypot(pPos.x - worldSize / 2, pPos.z - worldSize / 2);
        const inLakeCircle = LAKES.some((lake) => {
            const lx = worldSize / 2 + lake.x;
            const lz = worldSize / 2 + lake.z;
            return Math.hypot(pPos.x - lx, pPos.z - lz) < lake.r;
        });
        const inLakeWater = inLakeCircle && pPos.y < lakeSurfaceY - 0.02;
        const inWater = distFromCenter > islandRadius || inLakeWater;

        // DEBUG: Check Run State
        if (internalVel.current.length() > 0.1) {
            // console.log(`State: ${isRunning ? 'RUN' : 'WALK'} | Speed: ${internalVel.current.length().toFixed(2)} | Keys: ${JSON.stringify(keys.current)}`);
        }

        if (isSitting) {
            internalVel.current.set(0, 0);
            pPos.x = THREE.MathUtils.lerp(pPos.x, seatPosition.x, 0.35);
            pPos.z = THREE.MathUtils.lerp(pPos.z, seatPosition.z, 0.35);
            pPos.y = THREE.MathUtils.lerp(pPos.y, seatPosition.y, 0.35);
            playerRef.current.rotation.y = lerpAngle(playerRef.current.rotation.y, seatYaw, 0.2);
        } else {
            // Speed Tuning: Extreme for exploration, but with inertia
            // Walk: 18 units/sec
            // Run: 60 units/sec (Superhuman exploration speed)
            const maxSpeed = isRunning ? (inWater ? 25 : 60) : (inWater ? 8 : 18);

            // Physics Tuning: Slightly lower friction/accel ratio for "weight"
            const accel = (isRunning ? 120 : 70) * (inWater ? 0.6 : 1.0);
            const friction = (isRunning ? 8 : 10) * (inWater ? 1.5 : 1.0);

            // Camera-Relative Movement Logic
            const input = new THREE.Vector3(0, 0, 0);

            // Movement Vectors
            const moveForward = new THREE.Vector3();
            const moveRight = new THREE.Vector3();

            // Calculate Camera Direction (for Movement) based on rotation
            const camY = cameraRotation.current.y;
            // Forward is "into the screen" relative to camera, which is -sin(y), -cos(y)
            moveForward.set(-Math.sin(camY), 0, -Math.cos(camY)).normalize();
            moveRight.set(-Math.cos(camY), 0, Math.sin(camY)).normalize();

            // Apply inputs
            if (keys.current['KeyW'] || keys.current['ArrowUp']) input.add(moveForward);
            if (keys.current['KeyS'] || keys.current['ArrowDown']) input.sub(moveForward);
            if (keys.current['KeyA'] || keys.current['ArrowLeft']) input.sub(moveRight);
            if (keys.current['KeyD'] || keys.current['ArrowRight']) input.add(moveRight);

            if (input.lengthSq() > 0) {
                input.normalize().multiplyScalar(accel * d);
                // internalVel is Vector2(x, z) -> map Vector3(x, 0, z)
                internalVel.current.x += input.x;
                internalVel.current.y += input.z;
            }

            internalVel.current.multiplyScalar(1 - friction * d);
            if (internalVel.current.length() > maxSpeed) internalVel.current.setLength(maxSpeed);
            if (internalVel.current.length() < 0.01) internalVel.current.set(0, 0);

            const nextX = pPos.x + internalVel.current.x * d;
            const nextZ = pPos.z + internalVel.current.y * d;
            const playerRadius = 0.4; // Reduced to match visual size (approx 0.4 width)
            const solidTypes = [ResourceType.WOOD, ResourceType.STONE, ResourceType.STRUCTURE];

            if (entities && Array.isArray(entities)) {
                for (const ent of entities) {
                    if (!ent || !ent.pos || !solidTypes.includes(ent.type as ResourceType)) continue;
                    const dx = nextX - ent.pos.x;
                    const dz = nextZ - ent.pos.y;
                    const dist = Math.sqrt(dx * dx + dz * dz);

                    // Dynamic radius based on type to match visuals
                    let typeRadius = 1.0;
                    if (ent.type === ResourceType.WOOD) typeRadius = 0.4; // Tree trunk is thin (approx 0.35)
                    else if (ent.type === ResourceType.STONE) typeRadius = 0.8; // Rocks are wider (approx 0.7)
                    else if (ent.type === ResourceType.STRUCTURE) typeRadius = 2.0;

                    const entRadius = typeRadius * (ent.size || 1);
                    const minDist = playerRadius + entRadius;

                    if (dist < minDist) {
                        const nx = dx / dist;
                        const nz = dz / dist;
                        const overlap = minDist - dist;
                        pPos.x += nx * overlap;
                        pPos.z += nz * overlap;
                        const dot = internalVel.current.x * nx + internalVel.current.y * nz;
                        internalVel.current.x -= nx * dot * 1.05;
                        internalVel.current.y -= nz * dot * 1.05;
                    }
                }
            }

            // World Boundary (Square)
            let newX = THREE.MathUtils.clamp(pPos.x + internalVel.current.x * d, 0, worldSize);
            let newZ = THREE.MathUtils.clamp(pPos.z + internalVel.current.y * d, 0, worldSize);

            // Island Boundary (Irregular) - Prevent walking into water
            const dx = newX - worldSize / 2;
            const dz = newZ - worldSize / 2;
            const dist = Math.hypot(dx, dz);
            const angle = Math.atan2(dz, dx);

            // Get the dynamic boundary for this specific angle
            const dynamicRadius = getIslandBoundary(angle, islandRadius);

            // 5 unit buffer to stop right at the water's edge
            const maxDist = dynamicRadius - 5;

            if (dist > maxDist) {
                newX = (worldSize / 2) + Math.cos(angle) * maxDist;
                newZ = (worldSize / 2) + Math.sin(angle) * maxDist;

                // Kill velocity components moving outwards (simple slide along edge)
                internalVel.current.multiplyScalar(0.5);
            }

            // --- MOUNTAIN CABIN COLLISION (ROBUST AABB) ---
            const cabinX = worldSize / 2 + 100;
            const cabinZ = worldSize / 2 - 80;
            const cW = 6; // Half-width
            const cD = 5; // Half-depth
            const pR = 0.5; // Player collision radius

            const relX = newX - cabinX;
            const relZ = newZ - cabinZ;
            const prevRelX = pPos.x - cabinX;
            const prevRelZ = pPos.z - cabinZ;

            // Check if player is potentially colliding with the cabin rectangle
            if (Math.abs(relX) < cW + pR && Math.abs(relZ) < cD + pR) {
                const inFrontDoorway = Math.abs(relX) < 2.0 && relZ > cD - 1 && relZ < cD + 2;
                const inStairOpening = relX > cW - 1.0 && relX < cW + 2.3 && relZ > -5.8 && relZ < -3.6;
                const inDoorway = inFrontDoorway || inStairOpening;

                if (!inDoorway) {
                    const wasInside = Math.abs(prevRelX) < cW && Math.abs(prevRelZ) < cD;

                    if (wasInside) {
                        // Constraint: Stay inside
                        if (relX > cW - pR) { newX = cabinX + cW - pR; internalVel.current.x = 0; }
                        if (relX < -cW + pR) { newX = cabinX - cW + pR; internalVel.current.x = 0; }
                        if (relZ > cD - pR) { newZ = cabinZ + cD - pR; internalVel.current.y = 0; }
                        if (relZ < -cD + pR) { newZ = cabinZ - cD + pR; internalVel.current.y = 0; }
                    } else {
                        // Constraint: Stay outside
                        // Resolve by pushing to the nearest axis
                        const distToX = (cW + pR) - Math.abs(relX);
                        const distToZ = (cD + pR) - Math.abs(relZ);

                        if (distToX < distToZ) {
                            newX = cabinX + Math.sign(relX) * (cW + pR);
                            internalVel.current.x = 0;
                        } else {
                            newZ = cabinZ + Math.sign(relZ) * (cD + pR);
                            internalVel.current.y = 0;
                        }
                    }
                }
            }

            pPos.x = newX;
            pPos.z = newZ;

            // Follow Terrain Elevation
            const sampleR = 0.35;
            const groundClearance = 0.05;

            const hCenter = getTerrainHeight(pPos.x, pPos.z, worldSize, islandRadius);
            const hX1 = getTerrainHeight(pPos.x + sampleR, pPos.z, worldSize, islandRadius);
            const hX2 = getTerrainHeight(pPos.x - sampleR, pPos.z, worldSize, islandRadius);
            const hZ1 = getTerrainHeight(pPos.x, pPos.z + sampleR, worldSize, islandRadius);
            const hZ2 = getTerrainHeight(pPos.x, pPos.z - sampleR, worldSize, islandRadius);
            const fallbackY = Math.max(hCenter, hX1, hX2, hZ1, hZ2);

            let groundY = fallbackY;
            const terrainObj = state.scene.getObjectByName('islandTerrain');
            if (terrainObj) {
                const rayOrigin = new THREE.Vector3(pPos.x, 200, pPos.z);
                const rayDir = new THREE.Vector3(0, -1, 0);
                const raycaster = raycasterRef.current;
                raycaster.set(rayOrigin, rayDir);
                raycaster.far = 500;

                const hits = raycaster.intersectObject(terrainObj, true);
                if (hits.length > 0) {
                    groundY = hits[0].point.y;
                }
            }

            const cabinSupportY = getCabinSupportHeight(pPos.x, pPos.z, pPos.y);
            if (cabinSupportY !== null) {
                groundY = Math.max(groundY, cabinSupportY);
            }

            const targetY = groundY + groundClearance;
            const yAlphaUp = 0.65;
            const yAlphaDown = 0.2;
            const yAlpha = targetY > pPos.y ? yAlphaUp : yAlphaDown;
            pPos.y = THREE.MathUtils.lerp(pPos.y, targetY, yAlpha);
            if (pPos.y < targetY) pPos.y = targetY;
        }

        const speed = internalVel.current.length();

        const animFreq = Math.sqrt(speed) * 2.5;

        if (isSitting) {
            walkTime.current = 0;
        } else if (mode === '1P') {
            // In 1P, character body ALWAYS matches camera yaw
            playerRef.current.rotation.y = cameraRotation.current.y;
            walkTime.current += d * animFreq * (inWater ? 0.6 : 1.0);
        } else if (speed > 0.1) {
            // Animation Sync using new SQRT scaling
            walkTime.current += d * animFreq * (inWater ? 0.6 : 1.0);

            const currentPhaseIndex = Math.floor(walkTime.current / Math.PI);
            if (currentPhaseIndex !== lastFootIndex.current) {
                lastFootIndex.current = currentPhaseIndex;
                onFootstep?.(inWater);
            }
            const targetRotation = Math.atan2(internalVel.current.x, internalVel.current.y);
            playerRef.current.rotation.y = lerpAngle(playerRef.current.rotation.y, targetRotation, 0.15);
        } else {
            walkTime.current = lerpAngle(walkTime.current, Math.round(walkTime.current / Math.PI) * Math.PI, 0.1);
        }

        let camTarget = new THREE.Vector3();
        let lookTarget = new THREE.Vector3();

        // SHARED MOUSE ORBIT CALCULATION
        const rotY = cameraRotation.current.y;
        const rotX = cameraRotation.current.x;

        if (mode === '3P' || mode === '2P') {
            let camDist = mode === '3P' ? 22 : 10;
            const eyeLevel = isSitting ? 1.2 : 1.76;
            const heightOffset = isSitting ? (mode === '3P' ? 4 : 2) : (mode === '3P' ? 6 : 3);

            // Calculate "Ideal" target first
            let hDist = camDist * Math.cos(rotX);
            let vDist = camDist * Math.sin(rotX);
            let idealX = pPos.x + Math.sin(rotY) * hDist;
            let idealZ = pPos.z + Math.cos(rotY) * hDist;
            let idealY = pPos.y + eyeLevel + heightOffset + vDist;

            // Ground Collision Check & Dynamic Zoom
            const terrainHAtIdeal = getTerrainHeight(idealX, idealZ, worldSize, islandRadius);
            const safetyMargin = 0.8;

            if (idealY < terrainHAtIdeal + safetyMargin) {
                const sinX = Math.sin(rotX);
                if (sinX < -0.1) {
                    const targetDist = (terrainHAtIdeal + safetyMargin - (pPos.y + eyeLevel + heightOffset)) / sinX;
                    camDist = Math.max(2.0, Math.min(camDist, targetDist));
                }
            }

            // Recalculate with adjusted distance
            hDist = camDist * Math.cos(rotX);
            vDist = camDist * Math.sin(rotX);
            const finalX = pPos.x + Math.sin(rotY) * hDist;
            const finalZ = pPos.z + Math.cos(rotY) * hDist;
            const finalTerrainH = getTerrainHeight(finalX, finalZ, worldSize, islandRadius);
            const finalY = Math.max(pPos.y + eyeLevel + heightOffset + vDist, finalTerrainH + safetyMargin);

            camTarget.set(finalX, finalY, finalZ);
            lookTarget.set(pPos.x, pPos.y + eyeLevel, pPos.z); // Focus strictly on eye level

            camera.position.lerp(camTarget, mode === '2P' ? 0.2 : 0.25); // Faster lerp for better responsiveness

        } else if (mode === '1P') {
            const bobY = isSitting ? 0 : Math.sin(walkTime.current) * (speed * 0.0006);
            const eyeHeight = isSitting ? 1.2 : 1.76;

            // Camera position is at eyes, slightly forward
            // Forward is defined by rotY
            const camDirX = -Math.sin(rotY);
            const camDirZ = -Math.cos(rotY);

            camTarget.set(pPos.x + camDirX * 0.2, pPos.y + eyeHeight + bobY, pPos.z + camDirZ * 0.2);

            // View direction matches cameraRotation
            const viewDir = new THREE.Vector3(
                -Math.sin(rotY) * Math.cos(rotX),
                Math.sin(rotX),
                -Math.cos(rotY) * Math.cos(rotX)
            );
            lookTarget.copy(camTarget).add(viewDir.multiplyScalar(10));

            camera.position.lerp(camTarget, 0.3);
        }

        const targetDir = lookTarget.clone().sub(camera.position).normalize();
        const currentLook = new THREE.Vector3();
        camera.getWorldDirection(currentLook);

        const lookAlpha = mode === '1P' ? 0.4 : 0.12;
        camera.lookAt(camera.position.clone().add(currentLook.lerp(targetDir, lookAlpha)));

        const aimDir = new THREE.Vector3();
        camera.getWorldDirection(aimDir);
        onAimUpdate?.({
            origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            dir: { x: aimDir.x, y: aimDir.y, z: aimDir.z }
        });

        if (state.clock.elapsedTime - lastStateSync.current > 0.05) {
            lastStateSync.current = state.clock.elapsedTime;
            onUpdate({ x: pPos.x, y: pPos.z }, internalVel.current);
        }
    });

    const currentPos = playerRef.current ? playerRef.current.position : new THREE.Vector3(initialPos.x, 0, initialPos.y);
    const renderDistFromCenter = Math.hypot(currentPos.x - worldSize / 2, currentPos.z - worldSize / 2);
    const lakeSurfaceY = -0.15;
    const renderInLakeCircle = LAKES.some((lake) => {
        const lx = worldSize / 2 + lake.x;
        const lz = worldSize / 2 + lake.z;
        return Math.hypot(currentPos.x - lx, currentPos.z - lz) < lake.r;
    });
    const renderInLakeWater = renderInLakeCircle && currentPos.y < lakeSurfaceY - 0.02;

    return (
        <>
            <group ref={playerRef}>
                {mode !== '1P' && (
                    <Avatar
                        velocity={internalVel.current}
                        isWet={renderDistFromCenter > islandRadius || renderInLakeWater}
                        isFirstPerson={false}
                        walkTime={walkTime}
                        lastAttack={lastAttack}
                        avatarType={avatarType}
                    />
                )}
            </group>

            {/* VFX: Partículas de Passos */}
            <FootstepParticles
                playerPosition={currentPos}
                velocity={internalVel.current}
                inWater={renderDistFromCenter > islandRadius || renderInLakeWater}
            />
        </>
    );
};
