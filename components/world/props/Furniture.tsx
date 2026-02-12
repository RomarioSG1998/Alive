import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export const Desk: React.FC = () => {
    return (
        <group>
            {/* Table Top */}
            <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.5, 0.1, 1.2]} />
                <meshStandardMaterial color="#8d6e63" roughness={0.7} />
            </mesh>
            {/* Legs */}
            {[[-1.1, -0.5], [1.1, -0.5], [-1.1, 0.5], [1.1, 0.5]].map((p, i) => (
                <mesh key={i} position={[p[0], 0.35, p[1]]} castShadow receiveShadow>
                    <boxGeometry args={[0.1, 0.7, 0.1]} />
                    <meshStandardMaterial color="#5d4037" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
};

export const Chair: React.FC = () => {
    return (
        <group>
            {/* Seat */}
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.1, 0.5]} />
                <meshStandardMaterial color="#8d6e63" roughness={0.7} />
            </mesh>
            {/* Backrest */}
            <mesh position={[0, 0.8, -0.2]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.6, 0.05]} />
                <meshStandardMaterial color="#8d6e63" roughness={0.7} />
            </mesh>
            {/* Legs */}
            {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map((p, i) => (
                <mesh key={i} position={[p[0], 0.2, p[1]]} castShadow receiveShadow>
                    <boxGeometry args={[0.05, 0.4, 0.05]} />
                    <meshStandardMaterial color="#5d4037" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
};

interface ComputerProps {
    isOn?: boolean;
    screenUrl?: string;
    compact?: boolean;
}

export const Computer: React.FC<ComputerProps> = ({ isOn = false, screenUrl = '', compact = false }) => {
    return (
        <group>
            {compact ? (
                <>
                    {/* Laptop Base */}
                    <mesh position={[0, 0.06, 0.2]} castShadow receiveShadow>
                        <boxGeometry args={[0.62, 0.05, 0.42]} />
                        <meshStandardMaterial color="#37474f" roughness={0.35} metalness={0.45} />
                    </mesh>
                    {/* Laptop Screen */}
                    <group position={[0, 0.24, 0.02]} rotation={[-0.95, 0, 0]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.62, 0.38, 0.03]} />
                            <meshStandardMaterial color="#263238" />
                        </mesh>
                        {isOn ? (
                            <Html transform position={[0, 0, 0.02]} distanceFactor={0.55} style={{ pointerEvents: 'none' }}>
                                <div
                                    style={{
                                        width: 220,
                                        height: 128,
                                        borderRadius: 4,
                                        overflow: 'hidden',
                                        border: '2px solid #0f172a',
                                        background: '#020617'
                                    }}
                                >
                                    <iframe
                                        title="Desk Browser Mirror Laptop"
                                        src={screenUrl}
                                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                    />
                                </div>
                            </Html>
                        ) : (
                            <mesh position={[0, 0, 0.018]}>
                                <planeGeometry args={[0.56, 0.32]} />
                                <meshStandardMaterial color="#111827" roughness={0.6} metalness={0.1} />
                            </mesh>
                        )}
                    </group>
                </>
            ) : (
                <>
                    {/* Monitor Stand */}
                    <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.3, 0.1, 0.2]} />
                        <meshStandardMaterial color="#455a64" />
                    </mesh>
                    <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                        <boxGeometry args={[0.05, 0.3, 0.05]} />
                        <meshStandardMaterial color="#455a64" />
                    </mesh>
                    {/* Monitor Screen */}
                    <group position={[0, 0.5, 0.05]}>
                        <mesh castShadow>
                            <boxGeometry args={[0.8, 0.5, 0.05]} />
                            <meshStandardMaterial color="#263238" />
                        </mesh>
                        {isOn ? (
                            <Html transform position={[0, 0, 0.03]} distanceFactor={0.6} style={{ pointerEvents: 'none' }}>
                                <div
                                    style={{
                                        width: 300,
                                        height: 180,
                                        borderRadius: 6,
                                        overflow: 'hidden',
                                        border: '2px solid #0f172a',
                                        background: '#020617'
                                    }}
                                >
                                    <iframe
                                        title="Desk Browser Mirror"
                                        src={screenUrl}
                                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                                    />
                                </div>
                            </Html>
                        ) : (
                            <mesh position={[0, 0, 0.03]}>
                                <planeGeometry args={[0.75, 0.45]} />
                                <meshStandardMaterial
                                    color="#111827"
                                    emissive="#000000"
                                    emissiveIntensity={0}
                                    roughness={0.5}
                                    metalness={0.1}
                                />
                            </mesh>
                        )}
                    </group>
                    {/* Keyboard */}
                    <mesh position={[0, 0.02, 0.4]} castShadow receiveShadow>
                        <boxGeometry args={[0.6, 0.03, 0.25]} />
                        <meshStandardMaterial color="#37474f" />
                    </mesh>
                    {/* Mouse */}
                    <mesh position={[0.45, 0.02, 0.4]} castShadow receiveShadow>
                        <boxGeometry args={[0.08, 0.03, 0.12]} />
                        <meshStandardMaterial color="#37474f" />
                    </mesh>
                </>
            )}
        </group>
    );
};

const Candle: React.FC<{ isNight?: boolean }> = ({ isNight = false }) => {
    const flameRef = React.useRef<THREE.Mesh>(null);
    const lightRef = React.useRef<THREE.PointLight>(null);
    const fillRef = React.useRef<THREE.PointLight>(null);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const flicker = 0.85 + Math.sin(t * 13.2) * 0.12 + Math.sin(t * 19.7) * 0.06;
        if (flameRef.current) {
            flameRef.current.scale.set(1, flicker, 1);
        }
        if (lightRef.current) {
            const base = isNight ? 2.6 : 0.5;
            lightRef.current.intensity = base * flicker;
        }
        if (fillRef.current) {
            const baseFill = isNight ? 1.35 : 0.2;
            fillRef.current.intensity = baseFill * (0.9 + Math.sin(t * 2.8) * 0.06);
        }
    });

    return (
        <group position={[0.72, 0.82, 0.22]}>
            <mesh castShadow>
                <cylinderGeometry args={[0.03, 0.032, 0.14, 10]} />
                <meshStandardMaterial color="#f5f5f4" roughness={0.55} />
            </mesh>
            <mesh ref={flameRef} position={[0, 0.095, 0]}>
                <sphereGeometry args={[0.032, 10, 10]} />
                <meshStandardMaterial color="#ffd166" emissive="#ff8c42" emissiveIntensity={1.3} roughness={0.2} />
            </mesh>
            {/* Core flame light */}
            <pointLight ref={lightRef} position={[0, 0.11, 0]} color="#ffb74d" distance={11} decay={1.8} intensity={isNight ? 2.6 : 0.5} />
            {/* Wide warm fill so the candle lights the whole room */}
            <pointLight ref={fillRef} position={[0, 0.5, 0]} color="#ffd9a0" distance={24} decay={1.1} intensity={isNight ? 1.35 : 0.2} />
        </group>
    );
};

export const DeskSet: React.FC<{
    position: [number, number, number],
    rotation?: [number, number, number],
    computerOn?: boolean,
    computerScreenUrl?: string,
    compactComputer?: boolean,
    isNight?: boolean
}> = ({ position, rotation = [0, 0, 0], computerOn = false, computerScreenUrl = '', compactComputer = false, isNight = false }) => {
    return (
        <group position={position} rotation={rotation}>
            <Desk />
            {/* Computer faces the room (+Z) */}
            <group position={[0, 0.8, -0.2]} rotation={[0, 0, 0]}>
                <Computer isOn={computerOn} screenUrl={computerScreenUrl} compact={compactComputer} />
            </group>
            <Candle isNight={isNight} />
            {/* Chair faces the desk (-Z) */}
            <group position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]}>
                <Chair />
            </group>
        </group>
    );
};
