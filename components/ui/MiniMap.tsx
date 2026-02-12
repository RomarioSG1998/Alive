import React, { useMemo } from 'react';
import { Vector2, Entity, ResourceType } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { getIslandBoundary } from '../../utils/terrainUtils';

import { LAKES } from '../../utils/constants';

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

  // Transform World Pos -> Map Pos (RELATIVO AO JOGADOR)
  const worldToMap = (x: number, y: number) => {
    const relativeX = x - playerPosition.x;
    const relativeY = y - playerPosition.y;
    return {
      left: (relativeX * scale) + (mapSize / 2),
      top: (relativeY * scale) + (mapSize / 2)
    };
  };

  // Generate Irregular Island Shapes (Sand, Forest, Lakes) - RELATIVE TO PLAYER
  const mapFeatures = useMemo(() => {
    const points = 96; // Increased resolution for "exactness"
    const beachPoints: string[] = [];
    const forestPoints: string[] = [];
    const beachOffset = 0;
    const forestOffset = 20;

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const boundary = getIslandBoundary(angle, islandRadius);

      // World Coordinates of this point on the coastline
      const worldX = centerX + Math.cos(angle) * (boundary - beachOffset);
      const worldY = centerY + Math.sin(angle) * (boundary - beachOffset);
      const mP = worldToMap(worldX, worldY);
      beachPoints.push(`${mP.left},${mP.top}`);

      const wXF = centerX + Math.cos(angle) * (boundary - forestOffset);
      const wYF = centerY + Math.sin(angle) * (boundary - forestOffset);
      const mPF = worldToMap(wXF, wYF);
      forestPoints.push(`${mPF.left},${mPF.top}`);
    }

    // Prepare lakes data
    const lakeData = LAKES.map(lake => {
      const lx = centerX + lake.x;
      const ly = centerY + lake.z;
      const pos = worldToMap(lx, ly);
      return {
        cx: pos.left,
        cy: pos.top,
        r: lake.r * scale
      };
    });

    return {
      beach: beachPoints.join(' '),
      forest: forestPoints.join(' '),
      lakes: lakeData
    };
  }, [islandRadius, scale, mapSize, playerPosition.x, playerPosition.y, centerX, centerY]);

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

        {/* Camada 2, 3 & 4: Ilha Irregular e Lagos (SVG) */}
        <svg
          width={mapSize}
          height={mapSize}
          className="absolute inset-0 pointer-events-none"
          viewBox={`0 0 ${mapSize} ${mapSize}`}
        >
          {/* Beach / Sand Layer */}
          <polygon
            points={mapFeatures.beach}
            fill="#d4b483"
            fillOpacity="0.25"
          />
          {/* Forest / Interior Layer */}
          <polygon
            points={mapFeatures.forest}
            fill="#064e3b"
            fillOpacity="0.45"
          />
          {/* Lakes Layer */}
          {mapFeatures.lakes.map((lake, idx) => (
            <circle
              key={`lake-${idx}`}
              cx={lake.cx}
              cy={lake.cy}
              r={lake.r}
              fill="#3b82f6"
              fillOpacity="0.5"
            />
          ))}
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

        {/* Jogador (Ponto Vermelho) - SEMPRE NO CENTRO */}
        <div
          className="absolute transition-all duration-100 ease-linear z-10"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
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
