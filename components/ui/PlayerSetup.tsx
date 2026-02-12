import React, { useState } from 'react';
import { AvatarType } from '../../types';
import { AvatarSelector } from './AvatarSelector';
import { useGameStore } from '../../store/gameStore';
import { storageService } from '../../services/storageService';

interface PlayerSetupProps {
    onComplete: () => void;
}

export const PlayerSetup: React.FC<PlayerSetupProps> = ({ onComplete }) => {
    const { playerName, avatarType, setPlayerProfile } = useGameStore();
    const [name, setName] = useState(playerName || '');
    const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>(avatarType || 'gemini');

    const isEditing = !!playerName;

    const handleSave = () => {
        if (name.trim().length < 2) return;

        const profile = {
            name: name.trim(),
            avatarType: selectedAvatar,
            createdAt: Date.now()
        };

        storageService.savePlayerProfile(profile);
        setPlayerProfile(profile.name, profile.avatarType);
        onComplete();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-md p-8 rounded-3xl bg-white/10 border border-white/20 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tight">ALIVE</h1>
                    <p className="text-white/60">
                        {isEditing ? 'Altere suas configurações de perfil' : 'Crie seu perfil para começar a jornada'}
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                            Como devemos te chamar?
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Seu nome..."
                            className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all text-xl font-medium"
                            maxLength={15}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-1">
                            Escolha seu Personagem
                        </label>
                        <AvatarSelector selected={selectedAvatar} onSelect={setSelectedAvatar} />
                    </div>

                    <div className="flex gap-4">
                        {isEditing && (
                            <button
                                onClick={onComplete}
                                className="flex-1 py-5 rounded-2xl font-black text-lg bg-white/5 text-white/60 hover:bg-white/10 transition-all"
                            >
                                CANCELAR
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={name.trim().length < 2}
                            className={`flex-[2] py-5 rounded-2xl font-black text-lg transition-all duration-300 transform active:scale-95 ${name.trim().length >= 2
                                ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1'
                                : 'bg-white/5 text-white/20 cursor-not-allowed'
                                }`}
                        >
                            {isEditing ? 'SALVAR ALTERAÇÕES' : 'COMEÇAR AVENTURA'}
                        </button>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">
                        Seu progresso é salvo automaticamente
                    </p>
                </div>
            </div>
        </div>
    );
};
