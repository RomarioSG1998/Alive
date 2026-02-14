import { PlayerProfile, SavedGameState, UserSettings } from '../types';

const STORAGE_KEYS = {
    PLAYER_PROFILE: 'alive_player_profile',
    GAME_STATE: 'alive_game_state',
    USER_SETTINGS: 'alive_user_settings'
};

export const storageService = {
    savePlayerProfile: (profile: PlayerProfile): void => {
        try {
            localStorage.setItem(STORAGE_KEYS.PLAYER_PROFILE, JSON.stringify(profile));
        } catch (error) {
            console.error('Error saving player profile:', error);
        }
    },

    loadPlayerProfile: (): PlayerProfile | null => {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading player profile:', error);
            return null;
        }
    },

    saveGameState: (state: SavedGameState): void => {
        try {
            localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state));
        } catch (error) {
            console.error('Error saving game state:', error);
        }
    },

    loadGameState: (): SavedGameState | null => {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading game state:', error);
            return null;
        }
    },

    saveUserSettings: (settings: UserSettings): void => {
        try {
            localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving user settings:', error);
        }
    },

    loadUserSettings: (): UserSettings | null => {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading user settings:', error);
            return null;
        }
    },

    clearGameState: (): void => {
        try {
            localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
        } catch (error) {
            console.error('Error clearing game state:', error);
        }
    },

    clearAllData: (): void => {
        try {
            localStorage.removeItem(STORAGE_KEYS.PLAYER_PROFILE);
            localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
            localStorage.removeItem(STORAGE_KEYS.USER_SETTINGS);
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }
};
