
import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { ResourceType, GameState, Entity, Vector2 } from './types';
import { generateAvatar } from './services/geminiService';
import { audioService } from './services/audioService';
import { HUD } from './components/HUD';
import { GameCanvas } from './components/GameCanvas';
import { MiniMap } from './components/MiniMap';

const WORLD_SIZE = 3000;
const ISLAND_RADIUS = 350;
const CENTER = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 };
const RESOURCE_LIMIT = 40;
const DECOR_LIMIT = 150;
const COLLECTION_RADIUS = 28;

export type CameraMode = '1P' | '2P' | '3P';

const INITIAL_STATE: GameState = {
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
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [playerPosition, setPlayerPosition] = useState<Vector2>(CENTER);
  const [playerVelocity, setPlayerVelocity] = useState<THREE.Vector2>(new THREE.Vector2(0, 0));
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('3P');

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const lastLogicUpdate = useRef(Date.now());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      audioService.init(); // Init audio on first interaction
      keysPressed.current[e.code] = true;
      if (e.code === 'KeyV') {
        setCameraMode(prev => prev === '3P' ? '1P' : prev === '1P' ? '2P' : '3P');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    generateAvatar().then(url => setAvatarUrl(url));
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
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
    const radius = 20 + Math.random() * (ISLAND_RADIUS - 60);
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
      color: "#000"
    };
  }, []);

  useEffect(() => {
    const resources = Array.from({ length: RESOURCE_LIMIT }, () => createEntity(true));
    const decor = Array.from({ length: DECOR_LIMIT }, () => createEntity(false));
    setGameState(prev => ({ ...prev, entities: [...resources, ...decor] }));
  }, [createEntity]);

  const handleUpdatePosition = useCallback((pos: Vector2, vel: THREE.Vector2) => {
    if (!pos || !vel) return;
    setPlayerPosition(pos);
    setPlayerVelocity(vel);

    const now = Date.now();
    if (now - lastLogicUpdate.current > 100) {
      lastLogicUpdate.current = now;

      setGameState(prev => {
        if (!prev) return INITIAL_STATE;

        const dist = Math.hypot(pos.x - CENTER.x, pos.y - CENTER.y);
        const inWater = dist > ISLAND_RADIUS;

        let speed = 0;
        try {
          if (vel && typeof vel.length === 'function') {
            speed = vel.length();
          } else if (vel && typeof (vel as any).length === 'number') {
            speed = (vel as any).length;
          }
        } catch (e) {
          speed = 0;
        }

        const isRunning = speed > 150;
        const hungerDrain = isRunning ? 0.1 : 0.035;

        let newHunger = Math.max(0, (prev.hunger ?? 100) - hungerDrain);
        let newHealth = (prev.health ?? 100);

        if (newHunger <= 0) newHealth -= 0.25;
        if (inWater) newHealth -= 0.35;

        let collected: ResourceType | null = null;
        if (prev.entities && Array.isArray(prev.entities)) {
          const updatedEntities = prev.entities.filter(ent => {
            if (!ent || !ent.pos) return false;
            const isRes = [ResourceType.WOOD, ResourceType.STONE, ResourceType.FOOD].includes(ent.type as ResourceType);
            if (!isRes) return true;
            const d = Math.hypot(ent.pos.x - pos.x, ent.pos.y - pos.y);
            if (d < COLLECTION_RADIUS) { collected = ent.type as ResourceType; return false; }
            return true;
          });

          if (collected) {
            const inv = (prev.inventory || []).map(i => i.type === collected ? { ...i, count: (i.count || 0) + 1 } : i);
            const hungerBonus = collected === ResourceType.FOOD ? 25 : 0;
            return {
              ...prev,
              inventory: inv,
              entities: [...updatedEntities, createEntity(true)],
              hunger: Math.min(100, newHunger + hungerBonus),
              health: newHealth,
              log: [`+ ${collected}`, ...(prev.log || [])].slice(0, 10)
            };
          }

          return { ...prev, hunger: newHunger, health: newHealth, entities: updatedEntities };
        }

        return { ...prev, hunger: newHunger, health: newHealth };
      });
    }
  }, [createEntity]);

  const onFootstep = useCallback((isWet: boolean) => {
    audioService.playFootstep(isWet);
  }, []);

  const handleBuild = () => {
    if (!gameState || !gameState.inventory) return;
    const wood = gameState.inventory.find(i => i.type === ResourceType.WOOD)?.count || 0;
    const stone = gameState.inventory.find(i => i.type === ResourceType.STONE)?.count || 0;
    if (wood >= 5 && stone >= 3) {
      setGameState(prev => ({
        ...prev,
        inventory: (prev.inventory || []).map(i => {
          if (i.type === ResourceType.WOOD) return { ...i, count: i.count - 5 };
          if (i.type === ResourceType.STONE) return { ...i, count: i.count - 3 };
          return i;
        }),
        structures: [...(prev.structures || []), { id: `st-${Date.now()}`, type: ResourceType.STRUCTURE, pos: { ...playerPosition }, size: 2, color: '#fbbf24' }],
        log: ["Construção erguida.", ...(prev.log || [])].slice(0, 10)
      }));
    }
  };

  const safeLog = gameState.log || [];
  const safeInventory = gameState.inventory || [];

  if (!gameState) return <div className="flex items-center justify-center h-screen bg-[#bae6fd] mono">Carregando interface do sobrevivente...</div>;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#bae6fd] select-none font-sans">
      <GameCanvas
        playerPosition={playerPosition}
        entities={gameState.entities || []}
        worldSize={WORLD_SIZE}
        islandRadius={ISLAND_RADIUS}
        velocity={playerVelocity}
        onUpdatePosition={handleUpdatePosition}
        onFootstep={onFootstep}
        keysPressed={keysPressed}
        cameraMode={cameraMode}
      />

      <div className="absolute inset-0 pointer-events-none p-8 flex flex-col justify-between">
        <div className="flex justify-between items-start pointer-events-auto">
          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-black tracking-tighter text-zinc-800 opacity-90 uppercase italic mono drop-shadow-md">ALIVE</h1>
            <HUD
              health={gameState.health ?? 100}
              hunger={gameState.hunger ?? 100}
              avatarUrl={avatarUrl}
              cameraMode={cameraMode}
              onSetCameraMode={setCameraMode}
            />
          </div>

          <div className="flex flex-col items-end gap-6">
            <button onClick={handleBuild} className="px-6 py-3 bg-emerald-600/80 hover:bg-emerald-500 rounded-2xl border border-white/20 text-white mono text-xs font-bold transition-all hover:scale-105 pointer-events-auto shadow-lg shadow-emerald-900/20">
              <i className="fas fa-hammer mr-2"></i> Construir (5W, 3S)
            </button>
            <MiniMap
              playerPosition={playerPosition}
              structures={gameState.structures || []}
              worldSize={WORLD_SIZE}
              islandRadius={ISLAND_RADIUS}
              velocity={playerVelocity}
            />
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="w-96 h-48 overflow-hidden flex flex-col-reverse gap-3 mask-linear-fade pointer-events-none">
            {safeLog.map((entry, i) => (
              <div key={i} className={`text-sm transition-all duration-1000 ${i === 0 ? 'text-zinc-900 font-bold translate-x-2' : 'text-zinc-500 opacity-60'}`}>
                {entry}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-4 bg-white/20 rounded-3xl backdrop-blur-xl border border-white/40 shadow-xl pointer-events-auto">
            <div className="flex gap-4">
              {safeInventory.map(item => (
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

      {(gameState?.health ?? 100) <= 0 && (
        <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-10 animate-fade-in pointer-events-auto">
          <h2 className="text-6xl font-black text-red-600 mb-4 mono">FIM DA JORNADA</h2>
          <button onClick={() => window.location.reload()} className="px-10 py-4 bg-red-600 text-white hover:bg-red-500 rounded-full transition-all mono font-black">RECOMEÇAR</button>
        </div>
      )}
    </div>
  );
}
