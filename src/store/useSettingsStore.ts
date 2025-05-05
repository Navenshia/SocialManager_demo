import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiCredentials, Platform, PlatformStats } from '../types';
import { encryptData, decryptData } from '../lib/encryption';

interface SettingsState {
  apiCredentials: ApiCredentials;
  platformsEnabled: Record<Platform, boolean>;
  platformStats: Record<Platform, PlatformStats | null>;
  
  // API Credentials actions
  setInstagramCredentials: (accessToken: string) => void;
  setYoutubeCredentials: (apiKey: string, clientId: string, clientSecret: string, redirectUri: string, refreshToken?: string) => void;
  setTiktokCredentials: (baseUrl: string, accessToken: string) => void;
  clearCredentials: (platform: Platform) => void;
  
  // Platform toggle actions
  togglePlatform: (platform: Platform, enabled: boolean) => void;
  
  // Stats actions
  updatePlatformStats: (platform: Platform, stats: PlatformStats) => void;
}

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiCredentials: {},
      platformsEnabled: {
        instagram: false,
        youtube: false,
        tiktok: false,
      },
      platformStats: {
        instagram: null,
        youtube: null,
        tiktok: null,
      },
      
      setInstagramCredentials: (accessToken) => {
        const encryptedToken = encryptData(accessToken);
        set((state) => ({
          apiCredentials: {
            ...state.apiCredentials,
            instagram: {
              accessToken: encryptedToken,
            },
          },
          platformsEnabled: {
            ...state.platformsEnabled,
            instagram: true,
          },
        }));
      },
      
      setYoutubeCredentials: (apiKey, clientId, clientSecret, redirectUri, refreshToken) => {
        const encryptedApiKey = encryptData(apiKey);
        const encryptedClientId = encryptData(clientId);
        const encryptedClientSecret = encryptData(clientSecret);
        const encryptedRefreshToken = refreshToken ? encryptData(refreshToken) : undefined;
        
        set((state) => ({
          apiCredentials: {
            ...state.apiCredentials,
            youtube: {
              apiKey: encryptedApiKey,
              clientId: encryptedClientId,
              clientSecret: encryptedClientSecret,
              redirectUri,
              refreshToken: encryptedRefreshToken,
            },
          },
          platformsEnabled: {
            ...state.platformsEnabled,
            youtube: true,
          },
        }));
      },
      
      setTiktokCredentials: (baseUrl, accessToken) => {
        const encryptedToken = encryptData(accessToken);
        
        set((state) => ({
          apiCredentials: {
            ...state.apiCredentials,
            tiktok: {
              baseUrl,
              accessToken: encryptedToken,
            },
          },
          platformsEnabled: {
            ...state.platformsEnabled,
            tiktok: true,
          },
        }));
      },
      
      clearCredentials: (platform) => {
        set((state) => {
          const newCredentials = { ...state.apiCredentials };
          delete newCredentials[platform];
          
          return {
            apiCredentials: newCredentials,
            platformsEnabled: {
              ...state.platformsEnabled,
              [platform]: false,
            },
          };
        });
      },
      
      togglePlatform: (platform, enabled) => {
        set((state) => ({
          platformsEnabled: {
            ...state.platformsEnabled,
            [platform]: enabled,
          },
        }));
      },
      
      updatePlatformStats: (platform, stats) => {
        set((state) => ({
          platformStats: {
            ...state.platformStats,
            [platform]: stats,
          },
        }));
      },
    }),
    {
      name: 'social-media-settings',
      // Only store API credentials and enabled platforms
      partialize: (state) => ({
        apiCredentials: state.apiCredentials,
        platformsEnabled: state.platformsEnabled,
      }),
    }
  )
);

export default useSettingsStore;