
import React from 'react';
import { Vector2, Entity, ResourceType } from '../types';

interface MiniMapProps {
  playerPosition: Vector2;
  structures: Entity[];
  worldSize: number;
  islandRadius: number;
  velocity: { x: number; y: number };
}

export const MiniMap: React.FC<MiniMapProps> = ({ 
  playerPosition, 
  structures, 
  worldSize, 
  islandRadius,
  velocity 
}) => {
  const mapSize = 160; // Tamanho em pixels no HUD
  const scale = mapSize / worldSize;
  
  const centerX = worldSize / 2;
  const centerY = worldSize / 2;

  // Rotação do indicador do jogador baseada na velocidade
  const rotation = Math.atan2(velocity.x, -velocity.y) * (180 / Math.PI);

  return (
    <div className="relative group pointer-events-auto">
      {/* Moldura do Mapa */}
      <div 
        className="relative overflow-hidden rounded-full border-2 border-slate-700/50 bg-slate-900/40 backdrop-blur-xl shadow-2xl"
        style={{ width: mapSize, height: mapSize }}
      >
        {/* Oceano (Fundo) */}
        <div className="absolute inset-0 bg-sky-900/20" />

        {/* Ilha (Representação Visual) */}
        <div 
          className="absolute rounded-full bg-emerald-950/40 border border-emerald-500/10"
          style={{
            width: islandRadius * 2 * scale,
            height: islandRadius * 2 * scale,
            left: (centerX - islandRadius) * scale,
            top: (centerY - islandRadius) * scale,
          }}
        />

        {/* Linhas de Grade Táticas */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-full h-[1px] bg-white" />
          <div className="h-full w-[1px] bg-white" />
        </div>

        {/* Estruturas Construídas (Faróis) */}
        {structures.map((struct) => (
          <div
            key={struct.id}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,0.8)] animate-pulse"
            style={{
              left: struct.pos.x * scale - 4,
              top: struct.pos.y * scale - 4,
            }}
          />
        ))}

        {/* Jogador (Indicador) */}
        <div 
          className="absolute transition-all duration-100 ease-linear"
          style={{
            left: playerPosition.x * scale,
            top: playerPosition.y * scale,
            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
          }}
        >
          <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-bottom-[12px] border-b-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" />
        </div>

        {/* Marcadores Cardeais */}
        <div className="absolute inset-0 p-1 flex flex-col justify-between items-center text-[8px] font-black text-slate-500 pointer-events-none">
          <span>N</span>
          <span>S</span>
        </div>
        <div className="absolute inset-0 p-1 flex justify-between items-center text-[8px] font-black text-slate-500 pointer-events-none">
          <span className="ml-0.5">W</span>
          <span className="mr-0.5">E</span>
        </div>
      </div>
      
      {/* Label de Localização */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] mono font-bold text-slate-400 uppercase tracking-widest bg-slate-900/60 px-2 py-0.5 rounded-full border border-slate-700/50">
        LOC: {Math.round(playerPosition.x)} : {Math.round(playerPosition.y)}
      </div>
    </div>
  );
};
