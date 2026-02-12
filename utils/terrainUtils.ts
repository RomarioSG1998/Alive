
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

export const getIslandBoundary = (angle: number, baseRadius: number = ISLAND_RADIUS): number => {
    // Determine a "seed" coordinate on a unit circle from the angle
    const sx = Math.cos(angle);
    const sz = Math.sin(angle);

    // Sampling noise in circle-space ensures it's perfectly periodic (seamless at 0/2PI)
    // Frequency 1.2 = large scale "wobble"
    // Frequency 4.0 = mid scale inlets
    // Frequency 10.0 = small scale "rocks/jaggies"
    const p1 = new THREE.Vector2(sx * 1.2, sz * 1.2);
    const p2 = new THREE.Vector2(sx * 4.0, sz * 4.0);
    const p3 = new THREE.Vector2(sx * 10.0, sz * 10.0);

    const noise1 = fbm(p1, 2) * 45;   // Large features (+/- 45m)
    const noise2 = noise(p2) * 15;    // Medium features (+/- 15m)
    const noise3 = noise(p3) * 5;     // Small features (+/- 5m)

    return baseRadius + noise1 + noise2 + noise3;
};

export const getTerrainHeight = (x: number, z: number, worldSize: number = WORLD_SIZE, islandRadius: number = ISLAND_RADIUS): number => {
    const center = worldSize / 2;
    const dx = x - center;
    const dz = z - center;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    // Get dynamic boundary for this specific angle
    const dynamicRadius = getIslandBoundary(angle, islandRadius);

    // Falloff: Terrain only on the island, using the dynamic boundary
    const beachWidth = 40;
    const falloff = 1 - THREE.MathUtils.smoothstep(dist, dynamicRadius - beachWidth, dynamicRadius);

    if (dist > dynamicRadius) return -3.5; // Sea floor

    // Generate Base Relief
    const p = new THREE.Vector2(x * 0.04, z * 0.04);
    const baseHeight = fbm(p, 4) * 12;

    // Small details
    const detailP = new THREE.Vector2(x * 0.15, z * 0.15);
    const detailHeight = noise(detailP) * 1.5;

    let height = (baseHeight + detailHeight - 3) * falloff;

    // Center plateau for spawn stability (still circular for simplicity at center)
    const distFromCenter = Math.hypot(dx, dz);
    if (distFromCenter < 25) {
        height = THREE.MathUtils.lerp(0, height, THREE.MathUtils.smoothstep(distFromCenter, 0, 25));
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

    // Add Mountain Plateau (Buildable area)
    const mX = center + 100;
    const mZ = center - 80;
    const mDist = Math.hypot(x - mX, z - mZ);
    const mRadius = 80; // Slightly larger base for a better plateau
    const plateauRadius = 25;
    if (mDist < mRadius) {
        // Plateau logic: constant height at center, smooth falloff at edges
        const falloff = 1 - THREE.MathUtils.smoothstep(mDist, plateauRadius, mRadius);
        const mHeight = 25 * falloff;

        // Add very subtle organic variation (non-pointy)
        const organicDetail = noise(new THREE.Vector2(x * 0.05, z * 0.05)) * 1.2;
        height += mHeight + (mDist < mRadius ? organicDetail : 0);
    }

    return Math.max(-12, height);
};

export const getTerrainColor = (height: number, slope: number = 0, variation: number = 0): string => {
    const sand = new THREE.Color('#d7c08a');
    const dryGrass = new THREE.Color('#6b8e23');
    const lushGrass = new THREE.Color('#2f6f2a');
    const forest = new THREE.Color('#2f6f2a');
    const deepForest = new THREE.Color('#2e7d32');
    const wetRock = new THREE.Color('#5f6b5e');

    const v = THREE.MathUtils.clamp(variation, -0.25, 0.25);
    const steepness = THREE.MathUtils.clamp(slope, 0, 1);

    const color = new THREE.Color();

    if (height < -0.1) {
        color.copy(sand).offsetHSL(0.01 * v, -0.05 + v * 0.2, 0.04 * v);
        return `#${color.getHexString()}`;
    }

    if (height < 2) {
        // Transition band from beach to low grass
        const t = THREE.MathUtils.smoothstep(height, -0.1, 2);
        color.copy(sand).lerp(dryGrass, t);
        color.offsetHSL(0.01 * v, -0.06 * steepness, 0.06 * v);
        return `#${color.getHexString()}`;
    }

    if (height < 6) {
        const t = THREE.MathUtils.smoothstep(height, 2, 6);
        color.copy(dryGrass).lerp(lushGrass, t);
        color.lerp(wetRock, steepness * 0.12);
        color.offsetHSL(0.01 * v, 0.05 - steepness * 0.08, 0.05 * v);
        return `#${color.getHexString()}`;
    }

    if (height < 10) {
        const t = THREE.MathUtils.smoothstep(height, 6, 10);
        color.copy(forest).lerp(deepForest, t);
        color.lerp(wetRock, steepness * 0.08);
        color.offsetHSL(0.008 * v, 0.02 - steepness * 0.04, 0.05 * v);
        return `#${color.getHexString()}`;
    }

    // Mountaintop keeps same grass tonality as island, slightly darker only by slope.
    color.copy(deepForest).lerp(forest, 0.45);
    color.lerp(wetRock, steepness * 0.08);
    color.offsetHSL(0.006 * v, 0.02 - steepness * 0.03, 0.04 * v);
    return `#${color.getHexString()}`;
};
