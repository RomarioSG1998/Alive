
import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ResourceType, Entity, Vector2 } from './types';
import { generateAvatar } from './services/geminiService';
import { audioService } from './services/audioService';
import { HUD } from './components/ui/HUD';
import { GameCanvas } from './components/GameCanvas';
import { MiniMap } from './components/ui/MiniMap';
import { useGameStore } from './store/gameStore';

const WORLD_SIZE = 3000;
const ISLAND_RADIUS = 220; // Reduced from 350
const CENTER = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
const RESOURCE_LIMIT = 100; // Reduced to fit smaller island
const DECOR_LIMIT = 250;

export default function App() {
  // Local state for things that don't need to be global or are strictly UI ephemeral
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Game Store
  const {
    setEntities,
    setCameraMode,
    updateHealth,
    updateHunger,
    setInventory,
    setStructures,
    addLog,
    setLastAttack,
    setLastHit,
    health,
    inventory,
    log,
    entities,
    structures,
    cameraMode,
    lastAttack,
    lastHit
  } = useGameStore();

  // Physics/Movement State (kept local to App/Canvas loop for performance or moved to store if needed)
  // For now, let's keep position sync local but push critical updates to store if we want to save game
  const [playerPosition, setPlayerPosition] = useState<Vector2>(CENTER);
  const [playerVelocity, setPlayerVelocity] = useState<THREE.Vector2>(new THREE.Vector2(0, 0));

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastLogicUpdate = useRef(Date.now());
  const playerPosRef = useRef<Vector2>(CENTER);

  useEffect(() => {
    generateAvatar().then(url => setAvatarUrl(url));
  }, []);

  const createEntity = useCallback((isResource: boolean): Entity => {
    let type: ResourceType;
    if (isResource) {
      const types = [ResourceType.WOOD, ResourceType.STONE, ResourceType.FOOD];
      type = types[Math.floor(Math.random() * types.length)];
    } else {
      const decorTypes = [ResourceType.DECOR_TREE, ResourceType.BUSH, ResourceType.GRASS];
      type = decorTypes[Math.floor(Math.random() * decorTypes.length)];
    }

    const angle = Math.random() * Math.PI * 2;
    // Keep entities off the beach (Radius - 50)
    const radius = 20 + Math.random() * (ISLAND_RADIUS - 50);
    const health = isResource ? 3 : 1;
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      pos: {
        x: CENTER.x + Math.cos(angle) * radius,
        y: CENTER.y + Math.sin(angle) * radius
      },
      size: 0.8 + Math.random() * 1.5,
      rotation: Math.random() * Math.PI * 2,
      variant: Math.floor(Math.random() * 3),
      color: "#000",
      health,
      maxHealth: health
    };
  }, []);

  useEffect(() => {
    const resources = Array.from({ length: RESOURCE_LIMIT }, () => createEntity(true));
    const decor = Array.from({ length: DECOR_LIMIT }, () => createEntity(false));
    setEntities([...resources, ...decor]);
  }, [createEntity, setEntities]);

  const handleUpdatePosition = useCallback((pos: Vector2, vel: THREE.Vector2) => {
    if (!pos || !vel) return;
    setPlayerPosition(pos);
    setPlayerVelocity(vel);

    const now = Date.now();
    playerPosRef.current = pos;

    if (now - lastLogicUpdate.current > 100) {
      lastLogicUpdate.current = now;

      const dist = Math.hypot(pos.x - CENTER.x, pos.y - CENTER.y);
      const inWater = dist > ISLAND_RADIUS;
      const velLen = vel ? (typeof vel.length === 'function' ? vel.length() : (vel as any).length || 0) : 0;
      const isRunning = velLen > 15;

      const hungerDrain = isRunning ? 0.1 : 0.035;

      // We use the store actions directly
      // Note: In a real app, we might want to batch these or move logic to the store
      updateHunger(-hungerDrain);
      if (inWater) updateHealth(-0.35);

      // We need to check hunger from store state, but inside callback we might have stale closure
      // Ideally, specific game logic loop should be its own hook or store slice
      // For this refactor, we rely on the frequent updates.
    }
  }, [updateHunger, updateHealth]);

  const handleAttack = useCallback(() => {
    const now = Date.now();
    setLastAttack(now);

    // We need current entities state. 
    // Since this is a callback, we can use the state from the store hook if included in dependency
    // OR we can use useGameStore.getState() for one-off actions to avoid re-renders / stale closures
    const currentEntities = useGameStore.getState().entities;
    const currentInventory = useGameStore.getState().inventory;
    const currentLog = useGameStore.getState().log;

    const pPos = playerPosRef.current;
    const attackRange = 18;
    let closest: Entity | null = null;
    let minDist = attackRange;

    // ... (Same logic as before, just using local vars)
    const updatedEntities = currentEntities.map(ent => {
      if (!ent || !ent.pos) return ent;
      const isRes = [ResourceType.WOOD, ResourceType.STONE, ResourceType.FOOD].includes(ent.type as ResourceType);
      if (!isRes) return ent;

      const d = Math.hypot(ent.pos.x - pPos.x, ent.pos.y - pPos.y);
      if (d < minDist) {
        minDist = d;
        closest = ent;
      }
      return ent;
    });

    if (closest && minDist < attackRange) {
      const target = closest as Entity;
      setLastHit({ id: target.id, time: now });

      const newHealth = (target.health || 0) - 1;
      let finalEntities = updatedEntities;
      let newInventory = [...currentInventory];

      if (newHealth <= 0) {
        addLog(`+ 1 ${target.type}`);
        const typeIndex = newInventory.findIndex(i => i.type === target.type);
        if (typeIndex > -1) {
          newInventory[typeIndex] = { ...newInventory[typeIndex], count: newInventory[typeIndex].count + 1 };
        } else {
          newInventory.push({ type: target.type as ResourceType, count: 1 });
        }
        finalEntities = updatedEntities.filter(e => e.id !== target.id);
      } else {
        addLog(`Hit! HP: ${newHealth}`);
        finalEntities = updatedEntities.map(e => e.id === target.id ? { ...e, health: newHealth } : e);
      }

      setEntities(finalEntities);
      setInventory(newInventory);
    }

  }, [setLastAttack, setLastHit, setEntities, setInventory, addLog]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audioService.init();
      keysPressed.current[e.code] = true;
      if (e.code === 'KeyV') {
        setCameraMode(cameraMode === '3P' ? '1P' : cameraMode === '1P' ? '2P' : '3P');
      }
      if (e.code === 'Space') {
        handleAttack();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleAttack, cameraMode, setCameraMode]);

  const onFootstep = useCallback((isWet: boolean) => {
    audioService.playFootstep(isWet);
  }, []);

  const handleBuild = () => {
    const wood = inventory.find(i => i.type === ResourceType.WOOD)?.count || 0;
    const stone = inventory.find(i => i.type === ResourceType.STONE)?.count || 0;
    if (wood >= 5 && stone >= 3) {
      const newInventory = inventory.map(i => {
        if (i.type === ResourceType.WOOD) return { ...i, count: i.count - 5 };
        if (i.type === ResourceType.STONE) return { ...i, count: i.count - 3 };
        return i;
      });
      setInventory(newInventory);
      setStructures([...structures, { id: `st-${Date.now()}`, type: ResourceType.STRUCTURE, pos: { ...playerPosition }, size: 2, color: '#fbbf24' }]);
      addLog("Construção erguida.");
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#bae6fd] select-none font-sans">
      <GameCanvas
        playerPosition={playerPosition}
        worldSize={WORLD_SIZE}
        islandRadius={ISLAND_RADIUS}
        velocity={playerVelocity}
        onUpdatePosition={handleUpdatePosition}
        onFootstep={onFootstep}
        keysPressed={keysPressed}
      />

      <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-800 opacity-90 uppercase italic mono drop-shadow-md">ALIVE</h1>
            <HUD avatarUrl={avatarUrl} />
          </div>

          <div className="flex flex-col items-end gap-6">
            <button onClick={handleBuild} className="px-6 py-3 bg-emerald-600/80 hover:bg-emerald-500 rounded-2xl border border-white/20 text-white mono text-xs font-bold transition-all hover:scale-105 pointer-events-auto shadow-lg shadow-emerald-900/20">
              <i className="fas fa-hammer mr-2"></i> Construir (5W, 3S)
            </button>
            <MiniMap
              playerPosition={playerPosition}
              worldSize={WORLD_SIZE}
              islandRadius={ISLAND_RADIUS}
              velocity={playerVelocity}
            />
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="w-96 h-48 overflow-hidden flex flex-col-reverse gap-3 mask-linear-fade pointer-events-none">
            {log.map((entry, i) => (
              <div key={i} className={`text-sm transition-all duration-1000 ${i === 0 ? 'text-zinc-900 font-bold translate-x-2' : 'text-zinc-500 opacity-60'}`}>
                {entry}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-4 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/40 shadow-xl pointer-events-auto">
            <div className="flex gap-4">
              {inventory.map(item => (
                <div key={item.type} className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-white/40 border border-white/40 flex items-center justify-center rounded-2xl shadow-sm">
                    {item.type === ResourceType.WOOD && <i className="fas fa-tree text-amber-900 text-xl"></i>}
                    {item.type === ResourceType.STONE && <i className="fas fa-cube text-zinc-600 text-xl"></i>}
                    {item.type === ResourceType.FOOD && <i className="fas fa-apple-whole text-rose-600 text-xl"></i>}
                  </div>
                  <span className="text-[10px] mt-2 font-black mono text-zinc-900">{item.count || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(health <= 0) && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-10 animate-fade-in pointer-events-auto">
          <h2 className="text-6xl font-black text-red-600 mb-4 mono">FIM DA JORNADA</h2>
          <button onClick={() => window.location.reload()} className="px-10 py-4 bg-red-600 text-white hover:bg-red-500 rounded-full transition-all mono font-black">RECOMEÇAR</button>
        </div>
      )}
    </div>
  );
}
