import * as THREE from 'three';

// Helper to create procedural noise textures
export const generateNoiseTexture = (width: number, height: number, color: string, noiseIntensity: number = 20, scale: number = 1): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Base Color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    // Noise
    const output = ctx.getImageData(0, 0, width, height);
    const data = output.data;

    // Simple noise generator
    for (let i = 0; i < data.length; i += 4) {
        // Random variation: -intensity to +intensity
        const noise = (Math.random() - 0.5) * noiseIntensity;

        // Add noise to RGB (leave Alpha)
        data[i] = Math.min(255, Math.max(0, data[i] + noise));     // R
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise)); // G
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise)); // B
    }

    ctx.putImageData(output, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(scale, scale);

    return texture;
};
