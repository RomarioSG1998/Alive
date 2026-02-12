
import * as THREE from 'three';
import { LAKES, ISLAND_RADIUS, WORLD_SIZE } from './constants';

const hash = (p: THREE.Vector2) => {
    const dot = p.x * 12.9898 + p.y * 78.233;
    const sin = Math.sin(dot) * 43758.5453123;
    return sin - Math.floor(sin);
};

const noise = (p: THREE.Vector2) => {
    const i = new THREE.Vector2(Math.floor(p.x), Math.floor(p.y));
    const f = new THREE.Vector2(p.x - i.x, p.y - i.y);
    const u = new THREE.Vector2(
        f.x * f.x * (3.0 - 2.0 * f.x),
        f.y * f.y * (3.0 - 2.0 * f.y)
    );
    return THREE.MathUtils.lerp(
        THREE.MathUtils.lerp(hash(i), hash(new THREE.Vector2(i.x + 1, i.y)), u.x),
        THREE.MathUtils.lerp(hash(new THREE.Vector2(i.x, i.y + 1)), hash(new THREE.Vector2(i.x + 1, i.y + 1)), u.x),
        u.y
    );
};

const fbm = (p: THREE.Vector2, octaves: number = 4) => {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 0.5;
    const shift = new THREE.Vector2(100, 100);
    for (let i = 0; i < octaves; i++) {
        value += amplitude * noise(p.clone().multiplyScalar(frequency));
        p.add(shift);
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value;
};

export const getTerrainHeight = (x: number, z: number, worldSize: number = WORLD_SIZE, islandRadius: number = ISLAND_RADIUS): number => {
    const center = worldSize / 2;
    const dx = x - center;
    const dz = z - center;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Falloff: Terrain only on the island
    const beachWidth = 50;
    const falloff = 1 - THREE.MathUtils.smoothstep(dist, islandRadius - beachWidth, islandRadius);

    if (dist > islandRadius) return -3; // Sea floor

    // Generate Base Relief
    const p = new THREE.Vector2(x * 0.04, z * 0.04);
    const baseHeight = fbm(p, 4) * 12;

    // Small details
    const detailP = new THREE.Vector2(x * 0.15, z * 0.15);
    const detailHeight = noise(detailP) * 1.5;

    let height = (baseHeight + detailHeight - 3) * falloff;

    // Center plateau for spawn stability
    const distFromCenter = Math.hypot(dx, dz);
    if (distFromCenter < 25) {
        height *= (distFromCenter / 25);
    }

    // Carve Lakes - Apply depth where lakes exist
    LAKES.forEach(lake => {
        const lx = center + lake.x;
        const lz = center + lake.z;
        const lDist = Math.sqrt((x - lx) ** 2 + (z - lz) ** 2);
        if (lDist < lake.r) {
            const depth = (1 - THREE.MathUtils.smoothstep(lDist, 0, lake.r)) * 12;
            height -= depth;
        }
    });

    return Math.max(-12, height);
};

export const getTerrainColor = (height: number): string => {
    if (height < -0.1) return '#d6c68b'; // Sand
    if (height < 2) return '#3f6212';   // Grass
    if (height < 6) return '#166534';   // Forest
    if (height < 10) return '#14532d';  // Dense Forest
    return '#4a5568';                   // High Peaks
};
