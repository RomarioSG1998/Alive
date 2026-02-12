
import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ResourceType, Entity, Vector2 } from './types';
import { generateAvatar } from './services/geminiService';
import { audioService } from './services/audioService';
import { HUD } from './components/ui/HUD';
import { GameCanvas } from './components/GameCanvas';
import { MiniMap } from './components/ui/MiniMap';
import { useGameStore } from './store/gameStore';
import { LAKES } from './utils/constants';
import { getTerrainHeight, getIslandBoundary } from './utils/terrainUtils';
import { storageService } from './services/storageService';
import { PlayerSetup } from './components/ui/PlayerSetup';
import { SavedGameState } from './types';

const WORLD_SIZE = 3000;
const ISLAND_RADIUS = 220; // Reduced from 350
const CENTER = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
const RESOURCE_LIMIT = 100; // Reduced to fit smaller island
const DECOR_LIMIT = 250;

export default function App() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isReady, setIsReady] = useState(false);

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
    // 1. Check Profile
    const profile = storageService.loadPlayerProfile();
    if (!profile) {
      setShowSetup(true);
    } else {
      useGameStore.getState().setPlayerProfile(profile.name, profile.avatarType);

      // 2. Try loading game state
      const savedState = storageService.loadGameState();
      if (savedState) {
        const lakeSurfaceY = -0.15;
        const isInLakeCircle = LAKES.some((lake) => {
          const lx = CENTER.x + lake.x;
          const ly = CENTER.y + lake.z;
          return Math.hypot(savedState.position.x - lx, savedState.position.y - ly) < lake.r;
        });
        const groundY = getTerrainHeight(savedState.position.x, savedState.position.y, WORLD_SIZE, ISLAND_RADIUS);
        const isInLakeWater = isInLakeCircle && groundY < lakeSurfaceY - 0.02;

        const safePos = isInLakeWater ? CENTER : savedState.position;
        setPlayerPosition(safePos);
        playerPosRef.current = safePos;
        useGameStore.getState().setInventory(savedState.inventory);
        useGameStore.getState().setStructures(savedState.structures);
        useGameStore.getState().updateHealth(savedState.health - useGameStore.getState().health);
        useGameStore.getState().updateHunger(savedState.hunger - useGameStore.getState().hunger);
        addLog(`Bem-vindo de volta, ${profile.name}!`);
      }
    }

    setIsReady(true);
    generateAvatar().then(url => setAvatarUrl(url));
  }, [addLog]);

  // 3. Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const profile = storageService.loadPlayerProfile();
      if (!profile) return;

      const state = useGameStore.getState();
      const gameState: SavedGameState = {
        position: playerPosRef.current,
        inventory: state.inventory,
        health: state.health,
        hunger: state.hunger,
        structures: state.structures,
        lastSaved: Date.now()
      };
      storageService.saveGameState(gameState);
      // addLog("Jogo salvo."); // Silent save for better UX
    }, 15000); // 15 seconds

    return () => clearInterval(interval);
  }, []);

  const createEntity = useCallback((isResource: boolean, attempts = 0): Entity => {
    if (attempts > 10) return null as any; // Safety break

    let type: ResourceType;
    if (isResource) {
      const types = [ResourceType.WOOD, ResourceType.STONE, ResourceType.FOOD];
      type = types[Math.floor(Math.random() * types.length)];
    } else {
      const decorTypes = [ResourceType.DECOR_TREE, ResourceType.BUSH, ResourceType.GRASS];
      type = decorTypes[Math.floor(Math.random() * decorTypes.length)];
    }

    const angle = Math.random() * Math.PI * 2;
    const dynamicRadius = getIslandBoundary(angle, ISLAND_RADIUS);
    // Keep entities off the beach (Radius - 40)
    const radius = 20 + Math.random() * (dynamicRadius - 40);

    const x = CENTER.x + Math.cos(angle) * radius;
    const y = CENTER.y + Math.sin(angle) * radius;

    // Check Lake Collision
    for (const lake of LAKES) {
      const dist = Math.hypot(x - (CENTER.x + lake.x), y - (CENTER.y + lake.z));
      if (dist < lake.r + 2) { // +2 buffer
        return createEntity(isResource, attempts + 1);
      }
    }

    const health = isResource ? 3 : 1;
    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      pos: { x, y },
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
      const lakeSurfaceY = -0.15;
      const inLakeCircle = LAKES.some((lake) => {
        const lx = CENTER.x + lake.x;
        const ly = CENTER.y + lake.z;
        return Math.hypot(pos.x - lx, pos.y - ly) < lake.r;
      });
      const groundY = getTerrainHeight(pos.x, pos.y, WORLD_SIZE, ISLAND_RADIUS);
      const inLakeWater = inLakeCircle && groundY < lakeSurfaceY - 0.02;
      const inWater = dist > ISLAND_RADIUS || inLakeWater;
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

  // Double-tap state
  const lastTap = useRef<{ key: string, time: number }>({ key: '', time: 0 });
  const isAutoRunning = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Robust check: Use both e.code (physical) and e.key (value)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ControlLeft', 'ControlRight'].includes(e.code) ||
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Control'].includes(e.key)) {
        e.preventDefault();
      }

      audioService.init();
      // Register both for maximum compatibility
      const code = e.code;
      const key = e.key;

      keysPressed.current[code] = true;
      keysPressed.current[key] = true;

      // ALIASING FOR ROBUSTNESS
      let moveKey = '';
      if (code === 'ArrowUp' || key === 'ArrowUp') { keysPressed.current['KeyW'] = true; moveKey = 'ArrowUp'; }
      if (code === 'ArrowDown' || key === 'ArrowDown') { keysPressed.current['KeyS'] = true; moveKey = 'ArrowDown'; }
      if (code === 'ArrowLeft' || key === 'ArrowLeft') { keysPressed.current['KeyA'] = true; moveKey = 'ArrowLeft'; }
      if (code === 'ArrowRight' || key === 'ArrowRight') { keysPressed.current['KeyD'] = true; moveKey = 'ArrowRight'; }

      if (code === 'ControlLeft' || code === 'ControlRight' || key === 'Control') {
        keysPressed.current['Control'] = true;
        keysPressed.current['Ctrl'] = true;
      }
      if (moveKey) {
        const now = Date.now();
        if (lastTap.current.key === moveKey && (now - lastTap.current.time) < 300) {
          keysPressed.current['ShiftLeft'] = true; // Engage Run
          isAutoRunning.current = true;
        }
        lastTap.current = { key: moveKey, time: now };
      }

      if (e.code === 'KeyV') {
        setCameraMode(cameraMode === '3P' ? '1P' : cameraMode === '1P' ? '2P' : '3P');
      }
      if (e.code === 'Space') {
        handleAttack();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      const key = e.key;

      keysPressed.current[code] = false;
      keysPressed.current[key] = false;

      if (code === 'ControlLeft' || code === 'ControlRight' || key === 'Control') {
        keysPressed.current['Control'] = false;
        keysPressed.current['Ctrl'] = false;
      }
      // CLEAR ALIASES
      let moveKey = '';
      if (code === 'ArrowUp' || key === 'ArrowUp') { keysPressed.current['KeyW'] = false; moveKey = 'ArrowUp'; }
      if (code === 'ArrowDown' || key === 'ArrowDown') { keysPressed.current['KeyS'] = false; moveKey = 'ArrowDown'; }
      if (code === 'ArrowLeft' || key === 'ArrowLeft') { keysPressed.current['KeyA'] = false; moveKey = 'ArrowLeft'; }
      if (code === 'ArrowRight' || key === 'ArrowRight') { keysPressed.current['KeyD'] = false; moveKey = 'ArrowRight'; }

      // Stop running if we release the double-tapped key
      if (isAutoRunning.current && moveKey === lastTap.current.key) {
        keysPressed.current['ShiftLeft'] = false;
        isAutoRunning.current = false;
      }
    };

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
      {(showSetup || showSettings) && <PlayerSetup onComplete={() => { setShowSetup(false); setShowSettings(false); }} />}

      {!showSetup && isReady && (
        <>
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
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="w-12 h-12 bg-white/20 hover:bg-white/40 rounded-2xl border border-white/40 flex items-center justify-center text-white transition-all hover:rotate-90 pointer-events-auto backdrop-blur-xl shadow-lg"
                    title="Configurações de Perfil"
                  >
                    <i className="fas fa-cog text-xl"></i>
                  </button>
                  <button onClick={handleBuild} className="px-6 py-3 bg-emerald-600/80 hover:bg-emerald-500 rounded-2xl border border-white/20 text-white mono text-xs font-bold transition-all hover:scale-105 pointer-events-auto shadow-lg shadow-emerald-900/20">
                    <i className="fas fa-hammer mr-2"></i> Construir (5W, 3S)
                  </button>
                </div>
                <MiniMap
                  playerPosition={playerPosition}
                  worldSize={WORLD_SIZE}
                  islandRadius={ISLAND_RADIUS}
                  velocity={playerVelocity}
                  entities={entities}
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
              <button
                onClick={() => {
                  storageService.clearGameState();
                  window.location.reload();
                }}
                className="px-10 py-4 bg-red-600 text-white hover:bg-red-500 rounded-full transition-all mono font-black"
              >
                RECOMEÇAR
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
