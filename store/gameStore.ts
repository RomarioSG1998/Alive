
import { create } from 'zustand';
import { CameraMode, Entity, GameState, InventoryItem, ResourceType } from '../types';

interface GameStoreState extends GameState {
    cameraMode: CameraMode;
    lastAttack: number;
    lastHit: { id: string; time: number } | null;

    // Actions
    setCameraMode: (mode: CameraMode) => void;
    updateHealth: (amount: number) => void;
    updateHunger: (amount: number) => void;
    setInventory: (inventory: InventoryItem[]) => void;
    setEntities: (entities: Entity[]) => void;
    setStructures: (structures: Entity[]) => void;
    addLog: (message: string) => void;
    setLastAttack: (time: number) => void;
    setLastHit: (hit: { id: string; time: number } | null) => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
    // Initial State
    health: 100,
    hunger: 100,
    inventory: [
        { type: ResourceType.WOOD, count: 0 },
        { type: ResourceType.STONE, count: 0 },
        { type: ResourceType.FOOD, count: 0 },
    ],
    entities: [],
    structures: [],
    log: ["Ilha pequena, mar próximo.", "Sobreviva.", "WASD para mover.", "[V] para mudar câmera."],
    cameraMode: '3P', // Default camera mode
    lastAttack: 0,
    lastHit: null,

    // Actions
    setCameraMode: (mode) => set({ cameraMode: mode }),
    updateHealth: (amount) => set((state) => ({ health: Math.max(0, Math.min(100, state.health + amount)) })),
    updateHunger: (amount) => set((state) => ({ hunger: Math.max(0, Math.min(100, state.hunger + amount)) })),
    setInventory: (inventory) => set({ inventory }),
    setEntities: (entities) => set({ entities }),
    setStructures: (structures) => set({ structures }),
    addLog: (message) => set((state) => ({ log: [message, ...state.log].slice(0, 5) })),
    setLastAttack: (time) => set({ lastAttack: time }),
    setLastHit: (hit) => set({ lastHit: hit }),
}));
