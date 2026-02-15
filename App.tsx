
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import * as THREE from 'three';
import { AimState, ResourceType, Entity, Vector2, WeatherType, WorldPosition, TimeMode } from './types';
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
const ANIMAL_LIMIT = 26;
const DESK_TAB_PATH = '/desk-browser.html';
const ANIMAL_VARIANTS = new Set([10, 11]);
const CARCASS_VARIANT = 20;

const isAnimalEntity = (ent: Entity) => ent.type === ResourceType.FOOD && ANIMAL_VARIANTS.has(ent.variant || 0);
const isCarcassEntity = (ent: Entity) => ent.type === ResourceType.FOOD && (ent.variant || 0) === CARCASS_VARIANT;

type ArrowShotFx = {
  id: string;
  origin: { x: number; y: number; z: number };
  dir: { x: number; y: number; z: number };
  speed: number;
  bornAt: number;
  hitDistance: number;
};

export default function App() {
  const [weather, setWeather] = useState<WeatherType>(() => storageService.loadUserSettings()?.weather ?? 'sunny');
  const [timeMode, setTimeMode] = useState<TimeMode>(() => storageService.loadUserSettings()?.timeMode ?? 'auto');
  const [soundVolume, setSoundVolume] = useState(() => storageService.loadUserSettings()?.soundVolume ?? audioService.getVolume());
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSitting, setIsSitting] = useState(false);
  const [isObserving, setIsObserving] = useState(false);
  const [seatPromptDismissed, setSeatPromptDismissed] = useState(false);
  const [observatoryPromptDismissed, setObservatoryPromptDismissed] = useState(false);
  const [activeSeatPosition, setActiveSeatPosition] = useState<WorldPosition | null>(null);
  const [activeSeatYaw, setActiveSeatYaw] = useState(Math.PI);
  const [arrowCount, setArrowCount] = useState(20);
  const [arrowShots, setArrowShots] = useState<ArrowShotFx[]>([]);
  const [bowEquipped, setBowEquipped] = useState(true);
  const [isAiming, setIsAiming] = useState(false);
  const [aimPower, setAimPower] = useState(0);
  const [binocularZoom, setBinocularZoom] = useState(0.55);
  const [realMinutes, setRealMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

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
  const aimRef = useRef<AimState | null>(null);
  const isAimingRef = useRef(false);
  const drawStartRef = useRef<number | null>(null);

  const cabinPosition = useMemo<WorldPosition>(() => {
    const x = WORLD_SIZE / 2 + 100;
    const z = WORLD_SIZE / 2 - 80;
    const baseSamples: Array<[number, number]> = [
      [x, z],
      [x - 5.8, z - 4.8],
      [x - 5.8, z + 4.8],
      [x + 5.8, z - 4.8],
      [x + 5.8, z + 4.8],
      [x, z - 4.8],
      [x, z + 4.8],
      [x - 5.8, z],
      [x + 5.8, z],
    ];
    const y = Math.min(
      ...baseSamples.map(([sx, sz]) => getTerrainHeight(sx, sz, WORLD_SIZE, ISLAND_RADIUS))
    );
    return {
      x,
      z,
      y,
    };
  }, []);

  const deskPosition = useMemo<WorldPosition>(() => ({
    x: cabinPosition.x,
    y: cabinPosition.y + 0.85,
    z: cabinPosition.z - 3.5
  }), [cabinPosition]);

  const upperDeskPosition = useMemo<WorldPosition>(() => ({
    x: cabinPosition.x,
    y: cabinPosition.y + 7.6,
    z: cabinPosition.z + 3.2
  }), [cabinPosition]);

  const seatPosition = useMemo<WorldPosition>(() => ({
    x: cabinPosition.x,
    y: cabinPosition.y + 0.05,
    z: cabinPosition.z - 2.7
  }), [cabinPosition]);

  const upperSeatPosition = useMemo<WorldPosition>(() => ({
    x: cabinPosition.x,
    y: cabinPosition.y + 6.85,
    z: cabinPosition.z + 2.4
  }), [cabinPosition]);

  const observatoryPosition = useMemo<WorldPosition>(() => ({
    x: cabinPosition.x,
    y: cabinPosition.y + 10.95,
    z: cabinPosition.z
  }), [cabinPosition]);

  const observatoryYaw = useMemo(
    () => Math.atan2(CENTER.x - observatoryPosition.x, CENTER.y - observatoryPosition.z),
    [observatoryPosition]
  );

  const deskInteraction = useMemo(() => {
    const lowerDist = Math.hypot(playerPosition.x - deskPosition.x, playerPosition.y - deskPosition.z);
    const upperDist = Math.hypot(playerPosition.x - upperDeskPosition.x, playerPosition.y - upperDeskPosition.z);
    const nearLower = lowerDist < 2.1;
    const nearUpper = upperDist < 2.1;

    if (!nearLower && !nearUpper) return null;
    if (nearLower && !nearUpper) {
      return { seat: seatPosition, yaw: Math.PI, place: 'mesa térrea' as const };
    }
    if (!nearLower && nearUpper) {
      return { seat: upperSeatPosition, yaw: 0, place: 'notebook do andar superior' as const };
    }
    return lowerDist <= upperDist
      ? { seat: seatPosition, yaw: Math.PI, place: 'mesa térrea' as const }
      : { seat: upperSeatPosition, yaw: 0, place: 'notebook do andar superior' as const };
  }, [playerPosition, deskPosition, upperDeskPosition, seatPosition, upperSeatPosition]);

  const shouldShowSitPrompt = !!deskInteraction && !isSitting && !seatPromptDismissed;
  const nearObservatory = useMemo(
    () => Math.hypot(playerPosition.x - observatoryPosition.x, playerPosition.y - observatoryPosition.z) < 2.25,
    [playerPosition, observatoryPosition]
  );
  const shouldShowObservatoryPrompt = nearObservatory && !isObserving && !isSitting && !observatoryPromptDismissed;
  const nearbyCarcass = useMemo(() => {
    let candidate: Entity | null = null;
    let minDist = 3.2;
    for (const ent of entities) {
      if (!isCarcassEntity(ent)) continue;
      const d = Math.hypot(ent.pos.x - playerPosition.x, ent.pos.y - playerPosition.y);
      if (d < minDist) {
        minDist = d;
        candidate = ent;
      }
    }
    return candidate;
  }, [entities, playerPosition]);

  const spawnCarcassFromAnimal = useCallback((animal: Entity): Entity => {
    const variant = animal.variant === 11 ? 21 : 20;
    return {
      id: `carcass-${Math.random().toString(36).slice(2, 9)}`,
      type: ResourceType.FOOD,
      pos: { ...animal.pos },
      size: Math.max(0.95, (animal.size || 1) * 0.92),
      rotation: animal.rotation || 0,
      variant,
      color: '#000',
      health: 1,
      maxHealth: 1,
    };
  }, []);
  const deskPrimaryUrl = useMemo(() => {
    if (typeof window === 'undefined') return `${DESK_TAB_PATH}?mode=primary`;
    return new URL(`${DESK_TAB_PATH}?mode=primary`, window.location.href).toString();
  }, []);

  const deskMirrorUrl = useMemo(() => {
    if (typeof window === 'undefined') return `${DESK_TAB_PATH}?mode=mirror`;
    return new URL(`${DESK_TAB_PATH}?mode=mirror`, window.location.href).toString();
  }, []);

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

  useEffect(() => {
    if (!deskInteraction) setSeatPromptDismissed(false);
  }, [deskInteraction]);

  useEffect(() => {
    if (!nearObservatory) setObservatoryPromptDismissed(false);
  }, [nearObservatory]);

  useEffect(() => {
    if (isSitting || isObserving) {
      setIsAiming(false);
      drawStartRef.current = null;
      setAimPower(0);
    }
  }, [isSitting, isObserving]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setArrowShots(prev => prev.filter(s => now - s.bornAt < 1800));
    }, 300);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      setRealMinutes(d.getHours() * 60 + d.getMinutes());
    };
    updateClock();
    const id = window.setInterval(updateClock, 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    audioService.init();
    audioService.setVolume(soundVolume);
    storageService.saveUserSettings({ weather, timeMode, soundVolume });
  }, [weather, timeMode, soundVolume]);

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
    const cabinX = WORLD_SIZE / 2 + 100;
    const cabinZ = WORLD_SIZE / 2 - 80;

    // Never spawn world entities inside the cabin footprint.
    if (Math.abs(x - cabinX) < 9 && Math.abs(y - cabinZ) < 9) {
      return createEntity(isResource, attempts + 1);
    }

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

  const createAnimalEntity = useCallback((attempts = 0): Entity => {
    if (attempts > 12) return null as any;

    const angle = Math.random() * Math.PI * 2;
    const dynamicRadius = getIslandBoundary(angle, ISLAND_RADIUS);
    const radius = 35 + Math.random() * (dynamicRadius - 70);

    const x = CENTER.x + Math.cos(angle) * radius;
    const y = CENTER.y + Math.sin(angle) * radius;

    for (const lake of LAKES) {
      const dist = Math.hypot(x - (CENTER.x + lake.x), y - (CENTER.y + lake.z));
      if (dist < lake.r + 5) return createAnimalEntity(attempts + 1);
    }

    const cabinX = WORLD_SIZE / 2 + 100;
    const cabinZ = WORLD_SIZE / 2 - 80;
    if (Math.abs(x - cabinX) < 9 && Math.abs(y - cabinZ) < 9) {
      return createAnimalEntity(attempts + 1);
    }

    return {
      id: `animal-${Math.random().toString(36).slice(2, 9)}`,
      type: ResourceType.FOOD,
      pos: { x, y },
      size: 1.0 + Math.random() * 0.6,
      rotation: Math.random() * Math.PI * 2,
      variant: Math.random() < 0.55 ? 10 : 11, // 10 = deer, 11 = boar
      color: "#000",
      health: 4,
      maxHealth: 4
    };
  }, []);

  useEffect(() => {
    const resources = Array.from({ length: RESOURCE_LIMIT }, () => createEntity(true)).filter(Boolean);
    const animals = Array.from({ length: ANIMAL_LIMIT }, () => createAnimalEntity());
    const decor = Array.from({ length: DECOR_LIMIT }, () => createEntity(false)).filter(Boolean);
    setEntities([...resources, ...animals, ...decor].filter(Boolean));
  }, [createEntity, createAnimalEntity, setEntities]);

  useEffect(() => {
    if (!entities.length) return;
    const cabinX = WORLD_SIZE / 2 + 100;
    const cabinZ = WORLD_SIZE / 2 - 80;
    const nextEntities = entities.filter((ent) => {
      if (ent.type !== ResourceType.STONE) return true;
      return !(Math.abs(ent.pos.x - cabinX) < 9 && Math.abs(ent.pos.y - cabinZ) < 9);
    });
    if (nextEntities.length !== entities.length) {
      setEntities(nextEntities);
    }
  }, [entities, setEntities]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      const player = playerPosRef.current;
      useGameStore.setState((state) => {
        if (!state.entities.length) return state;
        let changed = false;
        const nextEntities = state.entities.map((ent) => {
          if (!isAnimalEntity(ent)) return ent;

          const distToPlayer = Math.hypot(ent.pos.x - player.x, ent.pos.y - player.y);
          const fleeing = distToPlayer < 26;
          const baseSpeed = ent.variant === 11 ? 1.35 : 1.15;
          const speed = baseSpeed * (fleeing ? 1.45 : 1);
          const rot = ent.rotation || 0;
          const moveRot = fleeing
            ? Math.atan2(ent.pos.y - player.y, ent.pos.x - player.x)
            : rot + (Math.random() - 0.5) * 0.42;

          let nx = ent.pos.x + Math.cos(moveRot) * speed;
          let ny = ent.pos.y + Math.sin(moveRot) * speed;

          const ang = Math.atan2(ny - CENTER.y, nx - CENTER.x);
          const maxR = getIslandBoundary(ang, ISLAND_RADIUS) - 8;
          const r = Math.hypot(nx - CENTER.x, ny - CENTER.y);
          if (r > maxR) {
            const edgeRot = ang + Math.PI + (Math.random() - 0.5) * 0.45;
            nx = ent.pos.x + Math.cos(edgeRot) * speed;
            ny = ent.pos.y + Math.sin(edgeRot) * speed;
          }

          let blocked = false;
          for (const lake of LAKES) {
            const dist = Math.hypot(nx - (CENTER.x + lake.x), ny - (CENTER.y + lake.z));
            if (dist < lake.r + 4.8) {
              blocked = true;
              break;
            }
          }
          if (Math.abs(nx - cabinPosition.x) < 9.5 && Math.abs(ny - cabinPosition.z) < 9.5) {
            blocked = true;
          }
          if (blocked) return { ...ent, rotation: moveRot + Math.PI * 0.75 };

          changed = true;
          return {
            ...ent,
            pos: { x: nx, y: ny },
            rotation: moveRot,
          };
        });

        if (!changed) return state;
        return { ...state, entities: nextEntities };
      });
    }, 220);

    return () => window.clearInterval(tick);
  }, [cabinPosition.x, cabinPosition.z]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      useGameStore.setState((state) => {
        const animalCount = state.entities.reduce((acc, ent) => acc + (isAnimalEntity(ent) ? 1 : 0), 0);
        const missing = ANIMAL_LIMIT - animalCount;
        if (missing <= 0) return state;
        const spawned = Array.from({ length: Math.min(2, missing) }, () => createAnimalEntity()).filter(Boolean);
        if (!spawned.length) return state;
        return { ...state, entities: [...state.entities, ...spawned] };
      });
    }, 2500);

    return () => window.clearInterval(tick);
  }, [createAnimalEntity]);

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
        const isAnimal = isAnimalEntity(target);
        const isCarcass = isCarcassEntity(target);
        if (isAnimal) {
          addLog('Animal abatido. Aproxime e pegue a carne [G].');
          finalEntities = [
            ...updatedEntities.filter(e => e.id !== target.id),
            spawnCarcassFromAnimal(target)
          ];
        } else if (isCarcass) {
          addLog('Use [G] para coletar a carne.');
          finalEntities = updatedEntities;
        } else {
          addLog(`+ 1 ${target.type}`);
          const typeIndex = newInventory.findIndex(i => i.type === target.type);
          if (typeIndex > -1) {
            newInventory[typeIndex] = { ...newInventory[typeIndex], count: newInventory[typeIndex].count + 1 };
          } else {
            newInventory.push({ type: target.type as ResourceType, count: 1 });
          }
          finalEntities = updatedEntities.filter(e => e.id !== target.id);
        }
      } else {
        addLog(`Hit! HP: ${newHealth}`);
        finalEntities = updatedEntities.map(e => e.id === target.id ? { ...e, health: newHealth } : e);
      }

      setEntities(finalEntities);
      setInventory(newInventory);
    }

  }, [setLastAttack, setLastHit, setEntities, setInventory, addLog, spawnCarcassFromAnimal]);

  const handleSitAccept = useCallback(() => {
    if (!deskInteraction) return;
    setIsSitting(true);
    setActiveSeatPosition(deskInteraction.seat);
    setActiveSeatYaw(deskInteraction.yaw);
    setSeatPromptDismissed(false);
    setPlayerPosition({ x: deskInteraction.seat.x, y: deskInteraction.seat.z });
    playerPosRef.current = { x: deskInteraction.seat.x, y: deskInteraction.seat.z };
    setPlayerVelocity(new THREE.Vector2(0, 0));
    keysPressed.current = {};
    const tab = window.open(deskPrimaryUrl, 'alive-desk-tab');
    if (!tab) {
      addLog('Bloqueio de pop-up ativo. Permita pop-ups para abrir a aba do computador.');
    }
    addLog(`Você sentou na cadeira (${deskInteraction.place}).`);
  }, [deskInteraction, addLog, deskPrimaryUrl]);

  const handleSitDecline = useCallback(() => {
    setSeatPromptDismissed(true);
    addLog('Você preferiu ficar em pé.');
  }, [addLog]);

  const handleStandUp = useCallback(() => {
    setIsSitting(false);
    setActiveSeatPosition(null);
    setActiveSeatYaw(Math.PI);
    setSeatPromptDismissed(true);
    keysPressed.current = {};
    addLog('Você levantou da cadeira.');
  }, [addLog]);

  const handleObservatoryAccept = useCallback(() => {
    setIsObserving(true);
    setObservatoryPromptDismissed(false);
    setPlayerPosition({ x: observatoryPosition.x, y: observatoryPosition.z });
    playerPosRef.current = { x: observatoryPosition.x, y: observatoryPosition.z };
    setPlayerVelocity(new THREE.Vector2(0, 0));
    setBinocularZoom(0.55);
    keysPressed.current = {};
    addLog('Observatório ativado. Binóculo pronto.');
  }, [observatoryPosition, addLog]);

  const handleObservatoryDecline = useCallback(() => {
    setObservatoryPromptDismissed(true);
    addLog('Você ignorou o observatório.');
  }, [addLog]);

  const handleObservatoryExit = useCallback(() => {
    setIsObserving(false);
    setObservatoryPromptDismissed(true);
    keysPressed.current = {};
    addLog('Observatório desativado.');
  }, [addLog]);

  // Double-tap state
  const lastTap = useRef<{ key: string, time: number }>({ key: '', time: 0 });
  const isAutoRunning = useRef(false);
  const lastArrowShot = useRef(0);

  const handleShootArrow = useCallback((power = 0.4) => {
    const now = Date.now();
    if (now - lastArrowShot.current < 240) return;
    lastArrowShot.current = now;

    if (!bowEquipped) {
      addLog('Rifle desativado. Ative para atirar.');
      return;
    }
    if (arrowCount <= 0) {
      addLog('Sem munição. Fabrique mais.');
      return;
    }
    if (!aimRef.current) {
      addLog('Sem linha de mira.');
      return;
    }

    const currentEntities = useGameStore.getState().entities;
    const origin = new THREE.Vector3(
      aimRef.current.origin.x,
      aimRef.current.origin.y,
      aimRef.current.origin.z
    );
    const dir = new THREE.Vector3(
      aimRef.current.dir.x,
      aimRef.current.dir.y,
      aimRef.current.dir.z
    ).normalize();

    const shotRange = 220;
    const damage = 8;
    const shotSpeed = 220 + power * 120;

    let bestTarget: Entity | null = null;
    let bestT = shotRange;

    for (const ent of currentEntities) {
      if (!ent || !isAnimalEntity(ent)) continue;
      const center = new THREE.Vector3(ent.pos.x, getTerrainHeight(ent.pos.x, ent.pos.y, WORLD_SIZE, ISLAND_RADIUS) + 0.55, ent.pos.y);
      const toTarget = center.clone().sub(origin);
      const t = toTarget.dot(dir);
      if (t < 0 || t > shotRange) continue;
      const closestPoint = origin.clone().addScaledVector(dir, t);
      const missDist = closestPoint.distanceTo(center);
      const hitRadius = 0.65 + (ent.size || 1) * 0.35;
      if (missDist <= hitRadius && t < bestT) {
        bestTarget = ent;
        bestT = t;
      }
    }

    setArrowCount(v => Math.max(0, v - 1));

    if (!bestTarget) {
      setArrowShots(prev => ([
        ...prev.slice(-24),
        {
          id: `shot-${now}-${Math.random().toString(36).slice(2, 7)}`,
          origin: { ...aimRef.current!.origin },
          dir: { ...aimRef.current!.dir },
          speed: shotSpeed,
          bornAt: now,
          hitDistance: shotRange * (0.78 + power * 0.2)
        }
      ]));
      addLog('Tiro de rifle falhou.');
      return;
    }

    const target = bestTarget as Entity;
    setLastHit({ id: target.id, time: now });

    const newHealth = (target.health || 0) - damage;
    let finalEntities = currentEntities;

    if (newHealth <= 0) {
      addLog('Tiro letal. Animal caiu. Pegue a carne [G].');
      finalEntities = [
        ...currentEntities.filter(e => e.id !== target.id),
        spawnCarcassFromAnimal(target)
      ];
    } else {
      addLog(`Tiro no alvo (${newHealth} HP).`);
      finalEntities = currentEntities.map(e => e.id === target.id ? { ...e, health: newHealth } : e);
    }

    setArrowShots(prev => ([
      ...prev.slice(-24),
      {
        id: `shot-${now}-${Math.random().toString(36).slice(2, 7)}`,
        origin: { ...aimRef.current!.origin },
        dir: { ...aimRef.current!.dir },
        speed: shotSpeed,
        bornAt: now,
        hitDistance: Math.max(2.5, bestT)
      }
    ]));

    setEntities(finalEntities);
  }, [arrowCount, addLog, setEntities, setLastHit, bowEquipped, spawnCarcassFromAnimal]);

  const handleEatFood = useCallback(() => {
    const food = inventory.find(i => i.type === ResourceType.FOOD)?.count || 0;
    if (food <= 0) {
      addLog('Sem comida para consumir.');
      return;
    }
    const newInventory = inventory.map(i => {
      if (i.type === ResourceType.FOOD) return { ...i, count: i.count - 1 };
      return i;
    });
    setInventory(newInventory);
    updateHunger(35);
    updateHealth(8);
    addLog('Você comeu e recuperou energia.');
  }, [inventory, setInventory, updateHunger, updateHealth, addLog]);

  const handleCraftArrows = useCallback(() => {
    const wood = inventory.find(i => i.type === ResourceType.WOOD)?.count || 0;
    if (wood < 1) {
      addLog('Precisa de 1 madeira para fabricar munição.');
      return;
    }
    const newInventory = inventory.map(i => {
      if (i.type === ResourceType.WOOD) return { ...i, count: i.count - 1 };
      return i;
    });
    setInventory(newInventory);
    setArrowCount(v => v + 5);
    addLog('+5 munições fabricadas.');
  }, [inventory, setInventory, addLog]);

  const handleCollectCarcass = useCallback(() => {
    if (!nearbyCarcass) {
      addLog('Aproxime-se da caça para coletar.');
      return;
    }
    const currentInventory = useGameStore.getState().inventory;
    const newInventory = [...currentInventory];
    const typeIndex = newInventory.findIndex(i => i.type === ResourceType.FOOD);
    if (typeIndex > -1) {
      newInventory[typeIndex] = { ...newInventory[typeIndex], count: newInventory[typeIndex].count + 1 };
    } else {
      newInventory.push({ type: ResourceType.FOOD, count: 1 });
    }
    setInventory(newInventory);
    setEntities(useGameStore.getState().entities.filter(e => e.id !== nearbyCarcass.id));
    addLog('+1 carne coletada.');
  }, [nearbyCarcass, setEntities, setInventory, addLog]);

  const handleAimUpdate = useCallback((aim: AimState) => {
    aimRef.current = aim;
  }, []);

  useEffect(() => {
    isAimingRef.current = isAiming;
  }, [isAiming]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!isAimingRef.current || drawStartRef.current === null) {
        setAimPower(0);
        return;
      }
      const charge = THREE.MathUtils.clamp((Date.now() - drawStartRef.current) / 900, 0, 1);
      setAimPower(charge);
    }, 40);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Robust check: Use both e.code (physical) and e.key (value)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ControlLeft', 'ControlRight'].includes(e.code) ||
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Control'].includes(e.key)) {
        e.preventDefault();
      }

      if (shouldShowSitPrompt && (e.code === 'KeyE' || e.code === 'Enter')) {
        e.preventDefault();
        handleSitAccept();
        return;
      }
      if (shouldShowSitPrompt && (e.code === 'KeyN' || e.code === 'Escape')) {
        e.preventDefault();
        handleSitDecline();
        return;
      }
      if (isSitting && (e.code === 'KeyX' || e.code === 'Escape')) {
        e.preventDefault();
        handleStandUp();
        return;
      }
      if (isObserving && (e.code === 'KeyX' || e.code === 'Escape')) {
        e.preventDefault();
        handleObservatoryExit();
        return;
      }
      if (isObserving && (e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        setBinocularZoom((z) => Math.min(1, z + 0.08));
        return;
      }
      if (isObserving && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        setBinocularZoom((z) => Math.max(0, z - 0.08));
        return;
      }
      if (!isObserving && isAiming && (e.code === 'Equal' || e.code === 'NumpadAdd')) {
        e.preventDefault();
        setBinocularZoom((z) => Math.min(1, z + 0.08));
        return;
      }
      if (!isObserving && isAiming && (e.code === 'Minus' || e.code === 'NumpadSubtract')) {
        e.preventDefault();
        setBinocularZoom((z) => Math.max(0, z - 0.08));
        return;
      }
      if (shouldShowObservatoryPrompt && (e.code === 'KeyE' || e.code === 'Enter')) {
        e.preventDefault();
        handleObservatoryAccept();
        return;
      }
      if (shouldShowObservatoryPrompt && (e.code === 'KeyN' || e.code === 'Escape')) {
        e.preventDefault();
        handleObservatoryDecline();
        return;
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
      if (e.code === 'KeyF') {
        if (cameraMode === '1P') {
          handleShootArrow(0.72);
        } else if (isAiming) {
          handleShootArrow(Math.max(0.35, aimPower));
        } else {
          addLog('No 1P, use [F] para atirar. No 2P/3P, mire com botão direito.');
        }
      }
      if (e.code === 'KeyC') {
        handleEatFood();
      }
      if (e.code === 'KeyG') {
        handleCollectCarcass();
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
  }, [handleAttack, handleShootArrow, handleEatFood, cameraMode, setCameraMode, shouldShowSitPrompt, shouldShowObservatoryPrompt, isSitting, isObserving, handleSitAccept, handleSitDecline, handleStandUp, handleObservatoryAccept, handleObservatoryDecline, handleObservatoryExit, addLog, aimPower, isAiming, bowEquipped, handleCollectCarcass]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (!isObserving && !isAiming) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      setBinocularZoom((z) => Math.max(0, Math.min(1, z + delta)));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [isObserving, isAiming]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (isSitting || isObserving || !bowEquipped) return;
      if (e.button === 2) {
        e.preventDefault();
        setIsAiming(true);
        drawStartRef.current = Date.now();
      }
      if (e.button === 0 && isAimingRef.current) {
        e.preventDefault();
        const charge = THREE.MathUtils.clamp((Date.now() - (drawStartRef.current || Date.now())) / 900, 0, 1);
        handleShootArrow(charge);
        drawStartRef.current = Date.now();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 2) {
        e.preventDefault();
        setIsAiming(false);
        drawStartRef.current = null;
        setAimPower(0);
      }
    };

    const onContext = (e: MouseEvent) => {
      if (!isSitting && !isObserving && bowEquipped) e.preventDefault();
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContext);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContext);
    };
  }, [isSitting, isObserving, bowEquipped, handleShootArrow]);

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
            weather={weather}
            timeMode={timeMode}
            realMinutes={realMinutes}
            isSitting={isSitting}
            isObserving={isObserving}
            isRifleAiming={!isObserving && !isSitting && bowEquipped && isAiming}
            binocularZoom={binocularZoom}
            seatPosition={activeSeatPosition ?? seatPosition}
            seatYaw={activeSeatYaw}
            observatoryPosition={observatoryPosition}
            observatoryYaw={observatoryYaw}
            computerOn={isSitting}
            computerScreenUrl={deskMirrorUrl}
            onUpdatePosition={handleUpdatePosition}
            onAimUpdate={handleAimUpdate}
            arrowShots={arrowShots}
            onFootstep={onFootstep}
            keysPressed={keysPressed}
          />

          {!isSitting && !isObserving && (
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
                    <button onClick={handleCraftArrows} className="px-6 py-3 bg-amber-600/80 hover:bg-amber-500 rounded-2xl border border-white/20 text-white mono text-xs font-bold transition-all hover:scale-105 pointer-events-auto shadow-lg shadow-amber-900/20">
                      <i className="fas fa-bullseye mr-2"></i> Munição +5 (1W)
                    </button>
                    <div className="px-3 py-2 rounded-2xl border border-white/25 bg-black/25 backdrop-blur-md shadow-lg flex items-center gap-2 pointer-events-auto">
                      <span className={`w-2 h-2 rounded-full ${bowEquipped ? 'bg-emerald-300' : 'bg-zinc-400'}`} />
                      <span className="text-[10px] mono font-black text-white/85 mr-1">{bowEquipped ? 'RIFLE ON' : 'RIFLE OFF'}</span>
                      <button
                        onClick={() => { setBowEquipped(true); setIsAiming(true); drawStartRef.current = Date.now(); addLog('Rifle ativo.'); }}
                        className={`px-3 py-2 rounded-xl border text-[10px] mono font-black transition-all ${bowEquipped ? 'bg-emerald-500/90 border-emerald-200/50 text-black' : 'bg-indigo-600/85 border-white/20 text-white hover:bg-indigo-500'}`}
                      >
                        <i className="fas fa-crosshairs mr-1.5"></i> Ativar
                      </button>
                      <button
                        onClick={() => { setBowEquipped(false); setIsAiming(false); drawStartRef.current = null; setAimPower(0); addLog('Rifle desativado.'); }}
                        className={`px-3 py-2 rounded-xl border text-[10px] mono font-black transition-all ${!bowEquipped ? 'bg-zinc-300 border-zinc-100/70 text-zinc-900' : 'bg-zinc-700/90 border-white/20 text-white hover:bg-zinc-600'}`}
                      >
                        <i className="fas fa-ban mr-1.5"></i> Desativar
                      </button>
                    </div>
                    <button onClick={handleEatFood} className="px-6 py-3 bg-rose-600/80 hover:bg-rose-500 rounded-2xl border border-white/20 text-white mono text-xs font-bold transition-all hover:scale-105 pointer-events-auto shadow-lg shadow-rose-900/20">
                      <i className="fas fa-drumstick-bite mr-2"></i> Comer [C]
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
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-white/40 border border-white/40 flex items-center justify-center rounded-2xl shadow-sm">
                        <i className="fas fa-location-arrow text-slate-700 text-xl"></i>
                      </div>
                      <span className="text-[10px] mt-2 font-black mono text-zinc-900">{arrowCount}</span>
                    </div>
                  </div>
                  <div className="text-[10px] mono font-bold text-zinc-700">Rifle: [Botão Direito] mira 1P + [Botão Esquerdo]/[F] atirar | Zoom: roda/+/- | [G] pegar caça</div>
                </div>
              </div>
            </div>
          )}

          {!isSitting && !isObserving && bowEquipped && isAiming && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0,transparent_24%,rgba(0,0,0,0.56)_40%)]" />
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border border-white/80 rounded-full shadow-[0_0_14px_rgba(255,255,255,0.45)]" />
                <div className="absolute left-1/2 top-0 h-10 w-[1px] -translate-x-1/2 bg-white/80" />
                <div className="absolute top-1/2 left-0 w-10 h-[1px] -translate-y-1/2 bg-white/80" />
              </div>
              <div className="absolute bottom-20 px-3 py-1 rounded-xl bg-black/40 text-white/90 text-[10px] mono">
                Mira de rifle 1P ativa | Zoom {Math.round(100 + binocularZoom * 350)}%
              </div>
            </div>
          )}

          {!isSitting && !isObserving && cameraMode === '1P' && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white/95 shadow-[0_0_8px_rgba(255,255,255,0.85)]" />
            </div>
          )}

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

          {shouldShowSitPrompt && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
              <div className="bg-zinc-900/80 text-white border border-white/20 rounded-2xl px-5 py-4 backdrop-blur-xl shadow-2xl flex items-center gap-4">
                <span className="text-sm font-bold mono">Sentar na cadeira?</span>
                <button
                  onClick={handleSitAccept}
                  className="px-4 py-2 text-xs font-black mono rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 transition-all"
                >
                  Sim [E]
                </button>
                <button
                  onClick={handleSitDecline}
                  className="px-4 py-2 text-xs font-black mono rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  Não [N]
                </button>
              </div>
            </div>
          )}

          {shouldShowObservatoryPrompt && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
              <div className="bg-zinc-900/80 text-white border border-white/20 rounded-2xl px-5 py-4 backdrop-blur-xl shadow-2xl flex items-center gap-4">
                <span className="text-sm font-bold mono">Ativar observatório?</span>
                <button
                  onClick={handleObservatoryAccept}
                  className="px-4 py-2 text-xs font-black mono rounded-xl bg-cyan-400 text-black hover:bg-cyan-300 transition-all"
                >
                  Sim [E]
                </button>
                <button
                  onClick={handleObservatoryDecline}
                  className="px-4 py-2 text-xs font-black mono rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  Não [N]
                </button>
              </div>
            </div>
          )}

          {!isSitting && !shouldShowSitPrompt && nearbyCarcass && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="bg-zinc-900/80 text-white border border-white/20 rounded-2xl px-4 py-3 backdrop-blur-xl shadow-2xl">
                <span className="text-xs font-bold mono">Carcaça próxima: pressione [G] para pegar carne</span>
              </div>
            </div>
          )}

          {isSitting && (
            <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
              <div className="bg-black/35 text-white/90 border border-white/10 rounded-lg px-3 py-1.5 backdrop-blur-sm text-[10px] mono tracking-wide">
                [V] câmera | [X] levantar
              </div>
            </div>
          )}

          {isObserving && (
            <>
              <div className="absolute inset-0 z-30 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_50%,transparent_0,transparent_21%,rgba(0,0,0,0.52)_31%),radial-gradient(circle_at_65%_50%,transparent_0,transparent_21%,rgba(0,0,0,0.52)_31%)]" />
                <div className="absolute inset-0 bg-black/12" />
                <div className="absolute left-1/2 top-1/2 w-[1px] h-8 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                <div className="absolute left-1/2 top-1/2 w-8 h-[1px] -translate-x-1/2 -translate-y-1/2 bg-white/80" />
              </div>
              <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
                <div className="bg-black/45 text-white/90 border border-white/15 rounded-lg px-3 py-1.5 backdrop-blur-sm text-[10px] mono tracking-wide">
                  Binóculo ativo | Zoom {Math.round(100 + binocularZoom * 500)}% | [+/-] ou roda do mouse | [X] sair
                </div>
              </div>
            </>
          )}

          <div className="absolute top-6 right-6 z-40 pointer-events-auto">
            <div className="bg-zinc-900/70 text-white border border-white/15 rounded-2xl p-2 backdrop-blur-md flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-black mono text-white/80">VOLUME</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={soundVolume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSoundVolume(v);
                    audioService.init();
                    audioService.setVolume(v);
                  }}
                  className="w-28 accent-emerald-500"
                />
                <span className="text-[10px] mono text-white/70 w-8 text-right">{Math.round(soundVolume * 100)}</span>
              </div>
              <div className="flex gap-2">
              {[
                { id: 'sunny', label: 'Ensolarado' },
                { id: 'cloudy', label: 'Nublado' },
                { id: 'drizzle', label: 'Chuva Fraca' },
                { id: 'storm', label: 'Tempestade' },
              ].map((w) => (
                <button
                  key={w.id}
                  onClick={() => {
                    audioService.init();
                    setWeather(w.id as WeatherType);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black mono transition-all ${weather === w.id
                    ? 'bg-emerald-500 text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                >
                  {w.label}
                </button>
              ))}
              </div>
              <div className="flex items-center gap-2 px-2">
                <span className="text-[10px] font-black mono text-white/80">CICLO</span>
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'day', label: 'Dia' },
                  { id: 'night', label: 'Noite' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setTimeMode(mode.id as TimeMode)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black mono transition-all ${timeMode === mode.id
                      ? 'bg-emerald-500 text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!isSitting && !isObserving && (
            <div className="absolute bottom-6 left-6 z-40 pointer-events-auto">
              <div className="px-3 py-3 rounded-2xl border border-white/20 bg-black/30 backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${bowEquipped ? 'bg-emerald-300' : 'bg-zinc-400'}`} />
                  <span className="text-[10px] mono font-black text-white/85">CONTROLE DO RIFLE</span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setBowEquipped(true);
                      setIsAiming(true);
                      drawStartRef.current = Date.now();
                      addLog('Rifle ativo.');
                    }}
                    className={`px-4 py-2 rounded-xl border mono text-xs font-bold transition-all ${bowEquipped ? 'bg-emerald-500/90 border-emerald-200/60 text-black' : 'border-white/20 text-white bg-indigo-600/85 hover:bg-indigo-500'}`}
                  >
                    <i className="fas fa-crosshairs mr-2"></i> Ativar Rifle
                  </button>
                  <button
                    onClick={() => {
                      setBowEquipped(false);
                      setIsAiming(false);
                      drawStartRef.current = null;
                      setAimPower(0);
                      addLog('Rifle desativado.');
                    }}
                    className={`px-4 py-2 rounded-xl border mono text-xs font-bold transition-all ${!bowEquipped ? 'bg-zinc-300 border-zinc-100/70 text-zinc-900' : 'border-white/20 text-white bg-zinc-700/85 hover:bg-zinc-600'}`}
                  >
                    <i className="fas fa-ban mr-2"></i> Desativar Rifle
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
