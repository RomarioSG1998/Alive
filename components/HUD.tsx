
import React from 'react';
import { CameraMode } from '../App';

interface HUDProps {
  health: number;
  hunger: number;
  avatarUrl: string | null;
  cameraMode: CameraMode;
  onSetCameraMode: (mode: CameraMode) => void;
}

export const HUD: React.FC<HUDProps> = ({ health, hunger, avatarUrl, cameraMode, onSetCameraMode }) => {
  const isFallback = avatarUrl?.includes('unsplash.com');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4 items-center bg-zinc-900/40 p-4 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl">
        {/* Avatar Section */}
        <div className="relative group">
          <div className="w-24 h-24 relative overflow-hidden bg-black border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
               style={{ clipPath: 'polygon(15% 0, 100% 0, 100% 85%, 85% 100%, 0 100%, 0 15%)' }}>
            {avatarUrl ? (
              <div className="w-full h-full relative">
                <img 
                  src={avatarUrl} 
                  alt="Survivor Avatar" 
                  className={`w-full h-full object-cover transition-all group-hover:scale-110 ${isFallback ? 'grayscale-[0.3] contrast-125' : ''}`}
                />
                {/* Tactical Overlays */}
                <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                <div className="absolute left-0 w-full h-[2px] bg-emerald-400/30 shadow-[0_0_10px_#10b981] animate-[scan_3s_linear_infinite]" />
                
                {isFallback && (
                  <div className="absolute top-1 left-1 bg-amber-500/80 text-[6px] px-1 font-bold text-black uppercase">
                    Offline Mode
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center animate-pulse gap-2">
                <i className="fas fa-dna text-zinc-600 text-3xl animate-spin-slow"></i>
                <span className="text-[8px] mono text-zinc-500 font-bold tracking-widest">RECONSTRUCTING...</span>
              </div>
            )}
          </div>
          
          {/* ID Badge Label */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-zinc-800 border border-white/10 px-2 py-0.5 rounded-sm shadow-xl">
             <span className="text-[7px] mono font-bold text-zinc-400 tracking-tighter">
               {isFallback ? 'LOCAL_HOST_01' : 'SURVIVOR_SIG_72'}
             </span>
          </div>

          <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#111] flex items-center justify-center shadow-lg">
             <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-64">
          {/* Vitality (Health) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-black">
              <span className="flex items-center gap-2">
                <i className="fas fa-heartbeat text-red-500 animate-pulse"></i> Vitalidade
              </span>
              <span className={health < 30 ? 'text-red-500 animate-bounce' : ''}>{Math.round(health)}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 overflow-hidden rounded-full p-0.5 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 transition-all duration-700 rounded-full" 
                style={{ width: `${health}%`, boxShadow: '0 0 10px rgba(220, 38, 38, 0.4)' }}
              />
            </div>
          </div>

          {/* Metabolism (Hunger) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.2em] text-zinc-400 font-black">
              <span className="flex items-center gap-2">
                <i className="fas fa-bolt text-amber-400"></i> Energia
              </span>
              <span>{Math.round(hunger)}%</span>
            </div>
            <div className="h-2.5 w-full bg-black/40 overflow-hidden rounded-full p-0.5 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-orange-600 via-amber-500 to-orange-400 transition-all duration-700 rounded-full" 
                style={{ width: `${hunger}%`, boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Camera Mode Switcher */}
      <div className="flex gap-2 p-2 bg-zinc-900/40 rounded-2xl border border-white/5 backdrop-blur-sm self-start pointer-events-auto">
        {(['1P', '2P', '3P'] as CameraMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onSetCameraMode(mode)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black mono transition-all ${
              cameraMode === mode 
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {mode}
          </button>
        ))}
        <div className="px-2 py-1.5 text-[8px] text-zinc-500 font-bold self-center mono">
          PRESS [V]
        </div>
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
