import React, { useMemo } from 'react';
import { Vector2, Entity, ResourceType } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { getIslandBoundary } from '../../utils/terrainUtils';

interface MiniMapProps {
  playerPosition: Vector2;
  worldSize: number;
  islandRadius: number;
  velocity: { x: number; y: number };
  entities: Entity[];
}

export const MiniMap: React.FC<MiniMapProps> = ({
  playerPosition,
  worldSize,
  islandRadius,
  velocity,
  entities
}) => {
  const { structures } = useGameStore();
  const mapSize = 160; // UI pixels

  // FOCUS: Map covers slightly more than the island diameter (2.5x radius)
  // This ensures the island fills the view but leaves some ocean margin.
  const mapViewRange = islandRadius * 2.5;
  const scale = mapSize / mapViewRange;

  const centerX = worldSize / 2;
  const centerY = worldSize / 2;

  // Transform World Pos -> Map Pos (Relative to Center of Map UI)
  const worldToMap = (x: number, y: number) => {
    const relativeX = x - centerX;
    const relativeY = y - centerY;
    return {
      left: (relativeX * scale) + (mapSize / 2),
      top: (relativeY * scale) + (mapSize / 2)
    };
  };

  // Convert Center for Island Circles
  const mapCenter = worldToMap(centerX, centerY);

  // Generate Irregular Island Shapes (Sand and Forest)
  const islandPaths = useMemo(() => {
    const points = 48; // Resolution of the map outline
    const beachPoints: string[] = [];
    const forestPoints: string[] = [];
    const beachOffset = 0;
    const forestOffset = 20;

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const boundary = getIslandBoundary(angle, islandRadius);

      // Beach line
      const rBeach = boundary - beachOffset;
      const xB = (Math.cos(angle) * rBeach * scale) + (mapSize / 2);
      const yB = (Math.sin(angle) * rBeach * scale) + (mapSize / 2);
      beachPoints.push(`${xB},${yB}`);

      // Forest line
      const rForest = boundary - forestOffset;
      const xF = (Math.cos(angle) * rForest * scale) + (mapSize / 2);
      const yF = (Math.sin(angle) * rForest * scale) + (mapSize / 2);
      forestPoints.push(`${xF},${yF}`);
    }

    return {
      beach: beachPoints.join(' '),
      forest: forestPoints.join(' ')
    };
  }, [islandRadius, scale, mapSize]);

  // Rotação do indicador do jogador baseada na velocidade
  const rotation = Math.atan2(velocity.x, -velocity.y) * (180 / Math.PI);

  return (
    <div className="relative group pointer-events-auto">
      {/* Moldura do Mapa */}
      <div
        className="relative overflow-hidden rounded-full border-2 border-slate-700/50 bg-slate-900/80 backdrop-blur-xl shadow-2xl"
        style={{ width: mapSize, height: mapSize }}
      >
        {/* Camada 1: Oceano (Fundo Profundo) */}
        <div className="absolute inset-0 bg-[#0f172a]" />

        {/* Camada 2 & 3: Ilha Irregular (SVG) */}
        <svg
          width={mapSize}
          height={mapSize}
          className="absolute inset-0 pointer-events-none"
          viewBox={`0 0 ${mapSize} ${mapSize}`}
        >
          {/* Beach / Sand Layer */}
          <polygon
            points={islandPaths.beach}
            fill="#d4b483"
            fillOpacity="0.25"
          />
          {/* Forest / Interior Layer */}
          <polygon
            points={islandPaths.forest}
            fill="#064e3b"
            fillOpacity="0.45"
          />
        </svg>

        {/* Recursos (Árvores e Pedras) */}
        {entities.map((ent) => {
          if (!ent.pos) return null;
          const pos = worldToMap(ent.pos.x, ent.pos.y);
          let color = '';

          // Only show relevant resources
          if (ent.type === ResourceType.WOOD) color = '#22c55e'; // Green
          else if (ent.type === ResourceType.STONE) color = '#94a3b8'; // Gray
          else return null;

          return (
            <div
              key={ent.id}
              className="absolute w-[2px] h-[2px] rounded-full opacity-60"
              style={{
                backgroundColor: color,
                left: pos.left,
                top: pos.top
              }}
            />
          );
        })}

        {/* Estruturas Construídas (Faróis/Casas) */}
        {structures.map((struct) => {
          const pos = worldToMap(struct.pos.x, struct.pos.y);
          return (
            <div
              key={struct.id}
              className="absolute w-2 h-2 bg-yellow-400 rounded-sm shadow-[0_0_4px_rgba(250,204,21,0.8)] animate-pulse"
              style={{
                left: pos.left - 4,
                top: pos.top - 4,
              }}
            />
          );
        })}

        {/* Linhas de Grade Táticas (Sutil) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-full h-[0.5px] bg-white" />
          <div className="h-full w-[0.5px] bg-white" />
        </div>

        {/* Jogador (Seta de Navegação) */}
        <div
          className="absolute transition-all duration-100 ease-linear z-10"
          style={{
            left: worldToMap(playerPosition.x, playerPosition.y).left,
            top: worldToMap(playerPosition.x, playerPosition.y).top,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
          }}
        >
          <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-bottom-[10px] border-b-white drop-shadow-md" />
        </div>

        {/* Marcadores Cardeais */}
        <div className="absolute inset-0 p-1 flex flex-col justify-between items-center text-[7px] font-black text-slate-500 pointer-events-none select-none">
          <span>N</span>
          <span>S</span>
        </div>
        <div className="absolute inset-0 p-1 flex justify-between items-center text-[7px] font-black text-slate-500 pointer-events-none select-none">
          <span className="ml-[2px]">W</span>
          <span className="mr-[2px]">E</span>
        </div>
      </div>

      {/* Label de Localização */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] mono font-bold text-slate-400 uppercase tracking-widest bg-slate-900/60 px-2 py-[2px] rounded-full border border-slate-700/50">
        LOC: {Math.round(playerPosition.x)} : {Math.round(playerPosition.y)}
      </div>
    </div>
  );
};
