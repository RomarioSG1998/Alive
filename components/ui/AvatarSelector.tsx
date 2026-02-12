import React from 'react';
import { AvatarType } from '../../types';

interface AvatarSelectorProps {
    selected: AvatarType;
    onSelect: (type: AvatarType) => void;
}

const AVATAR_OPTIONS: { type: AvatarType; label: string; color: string; description: string }[] = [
    { type: 'gemini', label: 'Sobrevivente', color: '#556b2f', description: 'Equipado para o ambiente selvagem' },
    { type: 'classic', label: 'Urbano', color: '#2b6cb0', description: 'Estilo casual das cidades' },
    { type: 'blocky', label: 'Atleta', color: '#c53030', description: 'Ágil e pronto para correr' },
    { type: 'robot', label: 'Técnico', color: '#4a5568', description: 'Especialista com ferramentas' }
];

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ selected, onSelect }) => {
    return (
        <div className="grid grid-cols-2 gap-4 mt-6">
            {AVATAR_OPTIONS.map((opt) => (
                <button
                    key={opt.type}
                    onClick={() => onSelect(opt.type)}
                    className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left overflow-hidden group ${selected === opt.type
                        ? 'border-blue-500 bg-white/20 scale-[1.02] shadow-lg'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30'
                        }`}
                >
                    {/* Background Glow */}
                    <div
                        className="absolute -right-4 -top-4 w-12 h-12 rounded-full blur-2xl opacity-40 group-hover:opacity-60 transition-opacity"
                        style={{ backgroundColor: opt.color }}
                    />

                    <h3 className={`font-bold text-lg ${selected === opt.type ? 'text-white' : 'text-white/80'}`}>
                        {opt.label}
                    </h3>
                    <p className="text-xs text-white/50 mt-1 leading-tight">
                        {opt.description}
                    </p>

                    {selected === opt.type && (
                        <div className="absolute bottom-2 right-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
};
