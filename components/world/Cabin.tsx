import { DeskSet } from './props/Furniture';

interface CabinProps {
    position: [number, number, number];
    computerOn?: boolean;
    computerScreenUrl?: string;
    isNight?: boolean;
}

export const Cabin: React.FC<CabinProps> = ({ position, computerOn = false, computerScreenUrl = '', isNight = false }) => {
    const wallColor = "#5d4037"; // Dark brown wood
    const floorColor = "#795548"; // Medium brown wood
    const frameColor = "#1f2937"; // Modern dark frame
    const slabColor = "#4b5563"; // Concrete slab

    return (
        <group position={position}>
            {/* Interior Furniture */}
            <DeskSet position={[0, 0.1, -3.5]} computerOn={computerOn} computerScreenUrl={computerScreenUrl} isNight={isNight} />

            {/* Room lights (night only emphasis) */}
            <pointLight position={[-2.8, 3.7, -1.5]} color="#ffdca8" intensity={isNight ? 0.32 : 0.08} distance={16} decay={2} />
            <pointLight position={[2.8, 3.7, 1.5]} color="#ffdca8" intensity={isNight ? 0.3 : 0.08} distance={16} decay={2} />

            {/* Floor */}
            <mesh position={[0, 0.05, 0]} receiveShadow>
                <boxGeometry args={[12, 0.1, 10]} />
                <meshStandardMaterial color={floorColor} roughness={0.8} />
            </mesh>

            {/* Back Wall with Window */}
            <group position={[0, 0, -4.9]}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[12, 1, 0.2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[12, 1, 0.2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[-5, 2.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2, 3, 0.2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[5, 2.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[2, 3, 0.2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
            </group>

            {/* Left Wall with Window */}
            <group position={[-5.9, 0, 0]}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 1, 10]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 1, 10]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 2.5, -4]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 3, 2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 2.5, 4]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 3, 2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
            </group>

            {/* Right Wall with Window */}
            <group position={[5.9, 0, 0]}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 1, 10]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 4.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 1, 10]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 2.5, -4]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 3, 2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                <mesh position={[0, 2.5, 4]} castShadow receiveShadow>
                    <boxGeometry args={[0.2, 3, 2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
            </group>

            {/* Front Wall (with door opening) */}
            <group position={[0, 2.5, 4.9]}>
                {/* Left piece */}
                <mesh position={[-4, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[4, 5, 0.2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                {/* Right piece */}
                <mesh position={[4, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[4, 5, 0.2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
                {/* Top piece (header) */}
                <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[4, 2, 0.2]} />
                    <meshStandardMaterial color={wallColor} roughness={0.9} />
                </mesh>
            </group>

            {/* Interior Pillars (for support look) */}
            {[[-5.5, -4.5], [5.5, -4.5], [-5.5, 4.5], [5.5, 4.5]].map((p, i) => (
                <mesh key={i} position={[p[0], 2.5, p[1]]} castShadow receiveShadow>
                    <boxGeometry args={[0.4, 5, 0.4]} />
                    <meshStandardMaterial color="#4e342e" roughness={0.9} />
                </mesh>
            ))}

            {/* Modern slab between floors */}
            <mesh position={[0, 5.05, 0]} receiveShadow castShadow>
                <boxGeometry args={[12.2, 0.35, 10.2]} />
                <meshStandardMaterial color={slabColor} roughness={0.85} metalness={0.05} />
            </mesh>

            {/* Second floor structure (higher + cleaner glass) */}
            <group position={[0, 8.6, 0]}>
                {/* Floor deck */}
                <mesh position={[0, -1.9, 0]} receiveShadow castShadow>
                    <boxGeometry args={[11.6, 0.26, 9.6]} />
                    <meshStandardMaterial color="#9ca3af" roughness={0.7} metalness={0.2} />
                </mesh>

                {/* Ceiling slab */}
                <mesh position={[0, 2.3, 0]} receiveShadow castShadow>
                    <boxGeometry args={[11.8, 0.32, 9.8]} />
                    <meshStandardMaterial color="#374151" roughness={0.75} metalness={0.25} />
                </mesh>

                {/* Upper floor furniture on opposite side */}
                <DeskSet
                    position={[0, -1.76, 3.2]}
                    rotation={[0, Math.PI, 0]}
                    computerOn={computerOn}
                    computerScreenUrl={computerScreenUrl}
                    compactComputer
                    isNight={isNight}
                />

                <pointLight position={[-2.6, 0.8, -1.8]} color="#ffe1b3" intensity={isNight ? 0.28 : 0.08} distance={14} decay={2} />
                <pointLight position={[2.6, 0.8, 1.8]} color="#ffe1b3" intensity={isNight ? 0.26 : 0.08} distance={14} decay={2} />

                {/* Glass walls */}
                <mesh position={[0, 0, -4.75]} castShadow receiveShadow>
                    <boxGeometry args={[11.2, 4.2, 0.08]} />
                    <meshStandardMaterial color="#dbeafe" transparent opacity={0.11} roughness={0.02} metalness={0.35} />
                </mesh>
                <mesh position={[0, 0, 4.75]} castShadow receiveShadow>
                    <boxGeometry args={[11.2, 4.2, 0.08]} />
                    <meshStandardMaterial color="#dbeafe" transparent opacity={0.11} roughness={0.02} metalness={0.35} />
                </mesh>
                <mesh position={[-5.55, 0, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.08, 4.2, 9.4]} />
                    <meshStandardMaterial color="#dbeafe" transparent opacity={0.11} roughness={0.02} metalness={0.35} />
                </mesh>
                {/* Right wall is split to create an access opening from stairs */}
                <mesh position={[5.55, 0, 2.2]} castShadow receiveShadow>
                    <boxGeometry args={[0.08, 4.2, 4.4]} />
                    <meshStandardMaterial color="#dbeafe" transparent opacity={0.11} roughness={0.02} metalness={0.35} />
                </mesh>
                <mesh position={[5.55, 0, -1.8]} castShadow receiveShadow>
                    <boxGeometry args={[0.08, 4.2, 3.2]} />
                    <meshStandardMaterial color="#dbeafe" transparent opacity={0.11} roughness={0.02} metalness={0.35} />
                </mesh>

                {/* Metal frames */}
                {[[-5.8, -4.9], [5.8, -4.9], [-5.8, 4.9], [5.8, 4.9]].map((p, i) => (
                    <mesh key={`sf-col-${i}`} position={[p[0], 0, p[1]]} castShadow>
                        <boxGeometry args={[0.18, 4.4, 0.18]} />
                        <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.55} />
                    </mesh>
                ))}
                <mesh position={[0, 2.1, -4.9]} castShadow>
                    <boxGeometry args={[11.7, 0.12, 0.18]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.55} />
                </mesh>
                <mesh position={[0, 2.1, 4.9]} castShadow>
                    <boxGeometry args={[11.7, 0.12, 0.18]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.55} />
                </mesh>
                <mesh position={[-5.9, 2.1, 0]} castShadow>
                    <boxGeometry args={[0.18, 0.12, 9.95]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.55} />
                </mesh>
                <mesh position={[5.9, 2.1, 0]} castShadow>
                    <boxGeometry args={[0.18, 0.12, 9.95]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.55} />
                </mesh>
            </group>

            {/* Full staircase to second floor */}
            <group>
                {Array.from({ length: 28 }).map((_, i) => (
                    <mesh key={`step-${i}`} position={[6.9, 0.12 + i * 0.24, 4.2 - i * 0.35]} castShadow receiveShadow>
                        <boxGeometry args={[1.25, 0.06, 0.34]} />
                        <meshStandardMaterial color="#6b7280" roughness={0.8} />
                    </mesh>
                ))}

                {/* Top landing */}
                <mesh position={[5.6, 6.74, -4.55]} castShadow receiveShadow>
                    <boxGeometry args={[2.4, 0.1, 1.5]} />
                    <meshStandardMaterial color="#9ca3af" roughness={0.75} metalness={0.2} />
                </mesh>

                {/* Stair rails */}
                <mesh position={[7.45, 3.38, -0.3]} rotation={[-0.62, 0, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.06, 10.3]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
                </mesh>
                <mesh position={[6.35, 3.38, -0.3]} rotation={[-0.62, 0, 0]} castShadow>
                    <boxGeometry args={[0.06, 0.06, 10.3]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
                </mesh>
            </group>

            {/* Roof staircase (second floor -> rooftop) */}
            <group>
                {Array.from({ length: 18 }).map((_, i) => (
                    <mesh key={`roof-step-${i}`} position={[7.05, 6.82 + i * 0.23, -4.75 + i * 0.2]} castShadow receiveShadow>
                        <boxGeometry args={[1.2, 0.07, 0.24]} />
                        <meshStandardMaterial color="#9ca3af" roughness={0.74} metalness={0.22} />
                    </mesh>
                ))}
                <mesh position={[7.55, 8.9, -3.0]} rotation={[-0.82, 0, 0]} castShadow>
                    <boxGeometry args={[0.07, 0.07, 4.1]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.62} />
                </mesh>
                <mesh position={[6.55, 8.9, -3.0]} rotation={[-0.82, 0, 0]} castShadow>
                    <boxGeometry args={[0.07, 0.07, 4.1]} />
                    <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.62} />
                </mesh>
            </group>

            {/* Modern guard rail */}
            <mesh position={[0, 7.35, 4.95]} castShadow>
                <boxGeometry args={[11.5, 0.08, 0.08]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Rooftop deck and guard rails */}
            <mesh position={[0, 10.95, 0]} receiveShadow castShadow>
                <boxGeometry args={[11.5, 0.18, 9.5]} />
                <meshStandardMaterial color="#475569" roughness={0.78} metalness={0.22} />
            </mesh>
            <mesh position={[0, 11.5, 4.8]} castShadow>
                <boxGeometry args={[11.4, 0.08, 0.08]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[0, 11.5, -4.8]} castShadow>
                <boxGeometry args={[11.4, 0.08, 0.08]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[-5.65, 11.5, 0]} castShadow>
                <boxGeometry args={[0.08, 0.08, 9.5]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
            </mesh>
            <mesh position={[5.65, 11.5, 0.9]} castShadow>
                <boxGeometry args={[0.08, 0.08, 7.7]} />
                <meshStandardMaterial color={frameColor} roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Rooftop observatory binocular */}
            <group position={[0, 11.12, 0]} rotation={[0, -Math.PI * 0.38, 0]}>
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.38, 0.44, 0.22, 14]} />
                    <meshStandardMaterial color="#374151" roughness={0.45} metalness={0.55} />
                </mesh>
                <mesh position={[0, 0.33, 0]} castShadow>
                    <cylinderGeometry args={[0.1, 0.11, 0.52, 14]} />
                    <meshStandardMaterial color="#4b5563" roughness={0.5} metalness={0.5} />
                </mesh>
                <mesh position={[0, 0.58, -0.18]} rotation={[0.26, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.16, 0.2, 0.9, 18]} />
                    <meshStandardMaterial color="#6b7280" roughness={0.34} metalness={0.72} />
                </mesh>
                <mesh position={[0, 0.67, -0.63]} castShadow>
                    <torusGeometry args={[0.11, 0.03, 12, 26]} />
                    <meshStandardMaterial color="#111827" roughness={0.18} metalness={0.8} />
                </mesh>
                <mesh position={[0, 0.71, -0.73]}>
                    <circleGeometry args={[0.07, 24]} />
                    <meshStandardMaterial color="#93c5fd" emissive="#60a5fa" emissiveIntensity={0.55} roughness={0.2} metalness={0.6} />
                </mesh>
            </group>
        </group>
    );
};
