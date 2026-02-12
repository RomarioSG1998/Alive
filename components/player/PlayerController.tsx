import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraMode, Entity, ResourceType, Vector2 } from '../../types';
import { Avatar } from './Avatar';
import { FootstepParticles } from '../effects/VFX';

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
    lastAttack
}) => {
    const { camera } = useThree();
    const playerRef = useRef<THREE.Group>(null);
    const internalVel = useRef(new THREE.Vector2(0, 0));
    const walkTime = useRef(0);
    const lastStateSync = useRef(0);
    const lastFootIndex = useRef(-1);
    const initialized = useRef(false);

    useEffect(() => {
        if (playerRef.current && !initialized.current) {
            playerRef.current.position.set(initialPos.x, 0, initialPos.y);
            initialized.current = true;
        }
    }, [initialPos]);

    const cameraRotation = useRef({ x: 0.3, y: Math.PI }); // x=pitch, y=yaw

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => {
            if (document.pointerLockElement === document.body) {
                cameraRotation.current.y -= e.movementX * 0.003;
                cameraRotation.current.x -= e.movementY * 0.003;
                // Clamp Pitch (-0.1 to 1.0 radians)
                cameraRotation.current.x = Math.max(-0.1, Math.min(1.2, cameraRotation.current.x));
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
        const isRunning = keys.current['ShiftLeft'] || keys.current['ShiftRight'];

        const pPos = playerRef.current.position;
        const distFromCenter = Math.hypot(pPos.x - worldSize / 2, pPos.z - worldSize / 2);
        const inWater = distFromCenter > islandRadius;

        // DEBUG: Check Run State
        if (internalVel.current.length() > 0.1) {
            // console.log(`State: ${isRunning ? 'RUN' : 'WALK'} | Speed: ${internalVel.current.length().toFixed(2)} | Keys: ${JSON.stringify(keys.current)}`);
        }

        // Speed Tuning: Reduced for realistic human scale (1 unit ~ 1 meter)
        // Walk: 6 units/sec
        // Run: 14 units/sec (Increased for contrast)
        const maxSpeed = isRunning ? (inWater ? 8 : 14) : (inWater ? 3 : 6);

        // Physics: Slower acceleration for weight, higher friction for stops
        const accel = (isRunning ? 50 : 25) * (inWater ? 0.6 : 1.0);
        const friction = (isRunning ? 10 : 7.5) * (inWater ? 2.0 : 1.0);

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

        // Island Boundary (Radial) - Prevent walking into water
        const dist = Math.hypot(newX - worldSize / 2, newZ - worldSize / 2);
        // 5 unit buffer to stop right at the water's edge
        const maxDist = islandRadius - 5;

        if (dist > maxDist) {
            const angle = Math.atan2(newZ - worldSize / 2, newX - worldSize / 2);
            newX = (worldSize / 2) + Math.cos(angle) * maxDist;
            newZ = (worldSize / 2) + Math.sin(angle) * maxDist;

            // Kill velocity components moving outwards (simple slide along edge)
            internalVel.current.multiplyScalar(0.5);
        }

        pPos.x = newX;
        pPos.z = newZ;

        const speed = internalVel.current.length();

        if (speed > 0.1) {
            // Animation Sync: 
            // 0.8 multiplier = matches foot speed to ground speed for ~6 units/sec
            walkTime.current += d * speed * (inWater ? 0.6 : 0.8);
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

        if (mode === '3P') {
            // Mouse Orbit Logic
            const rotY = cameraRotation.current.y;
            const rotX = cameraRotation.current.x;
            const camDist = 18;

            // Calculate position on sphere surface
            const hDist = camDist * Math.cos(rotX);
            const vDist = camDist * Math.sin(rotX); // Height

            const offsetX = Math.sin(rotY) * hDist;
            const offsetZ = Math.cos(rotY) * hDist;

            camTarget.set(pPos.x + offsetX, pPos.y + 10 + vDist, pPos.z + offsetZ);
            lookTarget.set(pPos.x, 2.5, pPos.z);

            // Responsive Lerp for orbit
            camera.position.lerp(camTarget, 0.2);

        } else if (mode === '1P') {
            const bobY = Math.sin(walkTime.current) * (speed * 0.0006);

            // Push camera forward slightly to align with eyes and peek past body
            const forwardOffset = new THREE.Vector3(0, 0, 0.4).applyEuler(playerRef.current.rotation);

            camTarget.set(pPos.x + forwardOffset.x, 1.76 + bobY, pPos.z + forwardOffset.z);

            // View direction matches Avatar's forward face (Positive Z in local space)
            const viewDir = new THREE.Vector3(0, 0, 1).applyEuler(playerRef.current.rotation);
            lookTarget.copy(camTarget).add(viewDir.multiplyScalar(10));

            // Snappier lerp for 1P so it feels responsive
            camera.position.lerp(camTarget, 0.25);

        } else {
            camTarget.set(pPos.x, 4, pPos.z - 16);
            lookTarget.set(pPos.x, 1.6, pPos.z);
            camera.position.lerp(camTarget, 0.08);
        }

        const targetDir = lookTarget.clone().sub(camera.position).normalize();
        const currentLook = new THREE.Vector3();
        camera.getWorldDirection(currentLook);

        // Faster look-at interpolation for 1P
        const lookAlpha = mode === '1P' ? 0.3 : 0.08;
        camera.lookAt(camera.position.clone().add(currentLook.lerp(targetDir, lookAlpha)));

        if (state.clock.elapsedTime - lastStateSync.current > 0.05) {
            lastStateSync.current = state.clock.elapsedTime;
            onUpdate({ x: pPos.x, y: pPos.z }, internalVel.current);
        }
    });

    const currentPos = playerRef.current ? playerRef.current.position : new THREE.Vector3(initialPos.x, 0, initialPos.y);
    const renderDistFromCenter = Math.hypot(currentPos.x - worldSize / 2, currentPos.z - worldSize / 2);

    return (
        <>
            <group ref={playerRef}>
                <Avatar
                    velocity={internalVel.current}
                    isWet={renderDistFromCenter > islandRadius}
                    isFirstPerson={mode === '1P'}
                    walkTime={walkTime}
                    lastAttack={lastAttack}
                />
            </group>

            {/* VFX: Partículas de Passos */}
            <FootstepParticles
                playerPosition={currentPos}
                velocity={internalVel.current}
                inWater={renderDistFromCenter > islandRadius}
            />
        </>
    );
};
