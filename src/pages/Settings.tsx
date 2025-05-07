import React, { useState } from 'react';
import { Instagram, Youtube, TrendingUp, CheckCircle, AlertCircle, Facebook } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toggle from '../components/ui/Toggle';
import useSettingsStore from '../store/useSettingsStore';
import { apiFactory } from '../api';
import { Platform } from '../types';

const Settings: React.FC = () => {
  // Settings store
  const {
    apiCredentials,
    platformsEnabled,
    setInstagramCredentials,
    setFacebookCredentials,
    setYoutubeCredentials,
    setTiktokCredentials,
    clearCredentials,
    togglePlatform
  } = useSettingsStore();

  // Form states
  const [instagramToken, setInstagramToken] = useState('');
  const [facebookToken, setFacebookToken] = useState('');
  const [youtubeApiKey, setYoutubeApiKey] = useState('');
  const [youtubeClientId, setYoutubeClientId] = useState('');
  const [youtubeClientSecret, setYoutubeClientSecret] = useState('');
  const [youtubeRedirectUri, setYoutubeRedirectUri] = useState('http://localhost:5173/auth/youtube/callback');
  const [tiktokBaseUrl, setTiktokBaseUrl] = useState('https://open-api.tiktok.com/v2');
  const [tiktokToken, setTiktokToken] = useState('');

  // Form submission states
  const [savingPlatform, setSavingPlatform] = useState<Platform | null>(null);
  const [errors, setErrors] = useState<{
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
  }>({});
  const [successMessages, setSuccessMessages] = useState<{
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
  }>({});

  // Handle Instagram form submission
  const handleInstagramSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlatform('instagram');
    setErrors({});
    setSuccessMessages({});

    try {
      if (!instagramToken) {
        setErrors(prev => ({ ...prev, instagram: 'Access Token is required' }));
        setSavingPlatform(null);
        return;
      }

      // Save the credentials
      setInstagramCredentials(instagramToken);

      // Reset API service to use new credentials
      apiFactory.resetApiService('instagram');

      // Show success message
      setSuccessMessages(prev => ({ ...prev, instagram: 'Instagram credentials saved successfully' }));
      setInstagramToken('');
    } catch (error: any) {
      console.error('Error saving Instagram credentials:', error);
      setErrors(prev => ({ ...prev, instagram: 'Failed to save Instagram credentials. Please check your access token and try again.' }));
    } finally {
      setSavingPlatform(null);
    }
  };

  // Handle Facebook form submission
  const handleFacebookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlatform('facebook');
    setErrors({});
    setSuccessMessages({});

    try {
      if (!facebookToken) {
        setErrors(prev => ({ ...prev, facebook: 'Access Token is required' }));
        setSavingPlatform(null);
        return;
      }

      console.log("Saving Facebook token (first 10 chars):", facebookToken.substring(0, 10) + "...");

      // Save the credentials
      setFacebookCredentials(facebookToken);

      // Reset API service to use new credentials
      apiFactory.resetApiService('facebook');

      // Show success message
      setSuccessMessages(prev => ({ ...prev, facebook: 'Facebook credentials saved successfully' }));
      setFacebookToken('');

      // Verify the token works by testing the API
      setTimeout(async () => {
        try {
          const facebookApi = apiFactory.getApiService('facebook');
          const profileInfo = await facebookApi.getBasicProfileInfo();
          console.log("Facebook profile verification successful:", profileInfo);
          setSuccessMessages(prev => ({
            ...prev,
            facebook: `Facebook credentials saved successfully. Connected to: ${profileInfo.name}`
          }));
        } catch (verifyError) {
          console.error("Error verifying Facebook token:", verifyError);
          setErrors(prev => ({
            ...prev,
            facebook: 'Token saved but verification failed. The token may be invalid or expired.'
          }));
        }
      }, 1000);
    } catch (error: any) {
      console.error('Error saving Facebook credentials:', error);
      setErrors(prev => ({ ...prev, facebook: 'Failed to save Facebook credentials. Please check your access token and try again.' }));
    } finally {
      setSavingPlatform(null);
    }
  };

  // Handle YouTube form submission
  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlatform('youtube');
    setErrors({});
    setSuccessMessages({});

    try {
      if (!youtubeApiKey || !youtubeClientId || !youtubeClientSecret) {
        setErrors(prev => ({ ...prev, youtube: 'API Key, Client ID, and Client Secret are required' }));
        setSavingPlatform(null);
        return;
      }

      // Save the credentials
      setYoutubeCredentials(
        youtubeApiKey,
        youtubeClientId,
        youtubeClientSecret,
        youtubeRedirectUri
      );

      // Reset API service to use new credentials
      apiFactory.resetApiService('youtube');

      // Show success message
      setSuccessMessages(prev => ({ ...prev, youtube: 'YouTube credentials saved successfully' }));

      // Clear form
      setYoutubeApiKey('');
      setYoutubeClientId('');
      setYoutubeClientSecret('');
    } catch (error) {
      setErrors(prev => ({ ...prev, youtube: 'Failed to save YouTube credentials' }));
    } finally {
      setSavingPlatform(null);
    }
  };

  // Handle TikTok form submission
  const handleTiktokSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlatform('tiktok');
    setErrors({});
    setSuccessMessages({});

    try {
      if (!tiktokToken || !tiktokBaseUrl) {
        setErrors(prev => ({ ...prev, tiktok: 'Base URL and Access Token are required' }));
        setSavingPlatform(null);
        return;
      }

      // Save the credentials
      setTiktokCredentials(tiktokBaseUrl, tiktokToken);

      // Reset API service to use new credentials
      apiFactory.resetApiService('tiktok');

      // Show success message
      setSuccessMessages(prev => ({ ...prev, tiktok: 'TikTok credentials saved successfully' }));
      setTiktokToken('');
    } catch (error) {
      setErrors(prev => ({ ...prev, tiktok: 'Failed to save TikTok credentials' }));
    } finally {
      setSavingPlatform(null);
    }
  };

  // Handle clearing credentials for a platform
  const handleClearCredentials = (platform: Platform) => {
    clearCredentials(platform);
    apiFactory.resetApiService(platform);
    setSuccessMessages(prev => ({ ...prev, [platform]: `${platform.charAt(0).toUpperCase() + platform.slice(1)} credentials cleared` }));
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your social media platform integrations
        </p>
      </div>

      <div className="space-y-8">
        {/* Instagram Settings */}
        <Card
          title="Instagram"
          icon={<Instagram className="text-pink-500" />}
          className="border-l-4 border-pink-500"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center mr-4">
                <Instagram size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Instagram</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {apiCredentials.instagram ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>

            <Toggle
              checked={platformsEnabled.instagram}
              onChange={(checked) => togglePlatform('instagram', checked)}
              disabled={!apiCredentials.instagram}
              color="pink"
            />
          </div>

          {apiCredentials.instagram ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your Instagram account is connected. You can disconnect at any time.
              </p>
              <Button
                variant="outline"
                onClick={() => handleClearCredentials('instagram')}
                size="sm"
              >
                Disconnect Account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleInstagramSubmit} className="space-y-4">
              <Input
                label="Access Token"
                value={instagramToken}
                onChange={(e) => setInstagramToken(e.target.value)}
                placeholder="Enter your Instagram access token"
                type="password"
              />

              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can get your access token from the Meta Developer Portal.
                <a
                  href="https://developers.facebook.com/docs/instagram-api/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Learn more
                </a>
              </p>

              {errors.instagram && (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.instagram}
                </div>
              )}

              {successMessages.instagram && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle size={16} className="mr-1" />
                  {successMessages.instagram}
                </div>
              )}

              <Button
                type="submit"
                disabled={savingPlatform === 'instagram'}
              >
                {savingPlatform === 'instagram' ? (savingPlatform === 'instagram' ? 'Saving...' : 'Save Credentials') : 'Save Credentials'}
              </Button>
            </form>
          )}
        </Card>

        {/* Facebook Settings */}
        <Card
          title="Facebook"
          icon={<Facebook className="text-blue-600" />}
          className="border-l-4 border-blue-600"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-4">
                <Facebook size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Facebook</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {apiCredentials.facebook ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>

            <Toggle
              checked={platformsEnabled.facebook}
              onChange={(checked) => togglePlatform('facebook', checked)}
              disabled={!apiCredentials.facebook}
              color="blue"
            />
          </div>

          {apiCredentials.facebook ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your Facebook account is connected. You can disconnect at any time.
              </p>
              <Button
                variant="outline"
                onClick={() => handleClearCredentials('facebook')}
                size="sm"
              >
                Disconnect Account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleFacebookSubmit} className="space-y-4">
              <Input
                label="Access Token"
                value={facebookToken}
                onChange={(e) => setFacebookToken(e.target.value)}
                placeholder="Enter your Facebook access token"
                type="password"
              />

              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can get your access token from the Meta Developer Portal.
                <a
                  href="https://developers.facebook.com/docs/facebook-login/guides/access-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Learn more
                </a>
              </p>

              {errors.facebook && (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.facebook}
                </div>
              )}

              {successMessages.facebook && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle size={16} className="mr-1" />
                  {successMessages.facebook}
                </div>
              )}

              <Button
                type="submit"
                disabled={savingPlatform === 'facebook'}
              >
                {savingPlatform === 'facebook' ? 'Saving...' : 'Save Credentials'}
              </Button>
            </form>
          )}
        </Card>

        {/* YouTube Settings */}
        <Card
          title="YouTube"
          icon={<Youtube className="text-red-500" />}
          className="border-l-4 border-red-500"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center mr-4">
                <Youtube size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium">YouTube</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {apiCredentials.youtube ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>

            <Toggle
              checked={platformsEnabled.youtube}
              onChange={(checked) => togglePlatform('youtube', checked)}
              disabled={!apiCredentials.youtube}
              color="red"
            />
          </div>

          {apiCredentials.youtube ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your YouTube account is connected. You can disconnect at any time.
              </p>
              <Button
                variant="outline"
                onClick={() => handleClearCredentials('youtube')}
                size="sm"
              >
                Disconnect Account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleYoutubeSubmit} className="space-y-4">
              <Input
                label="API Key"
                value={youtubeApiKey}
                onChange={(e) => setYoutubeApiKey(e.target.value)}
                placeholder="Enter your YouTube API key"
                type="password"
              />

              <Input
                label="Client ID"
                value={youtubeClientId}
                onChange={(e) => setYoutubeClientId(e.target.value)}
                placeholder="Enter your OAuth client ID"
                type="password"
              />

              <Input
                label="Client Secret"
                value={youtubeClientSecret}
                onChange={(e) => setYoutubeClientSecret(e.target.value)}
                placeholder="Enter your OAuth client secret"
                type="password"
              />

              <Input
                label="Redirect URI"
                value={youtubeRedirectUri}
                onChange={(e) => setYoutubeRedirectUri(e.target.value)}
                placeholder="Enter your OAuth redirect URI"
              />

              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can get these credentials from the Google Cloud Console.
                <a
                  href="https://developers.google.com/youtube/v3/getting-started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Learn more
                </a>
              </p>

              {errors.youtube && (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.youtube}
                </div>
              )}

              {successMessages.youtube && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle size={16} className="mr-1" />
                  {successMessages.youtube}
                </div>
              )}

              <Button
                type="submit"
                disabled={savingPlatform === 'youtube'}
              >
                {savingPlatform === 'youtube' ? 'Saving...' : 'Save Credentials'}
              </Button>
            </form>
          )}
        </Card>

        {/* TikTok Settings */}
        <Card
          title="TikTok"
          icon={<TrendingUp className="text-black dark:text-white" />}
          className="border-l-4 border-black dark:border-white"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center mr-4">
                <TrendingUp size={20} className="text-white dark:text-black" />
              </div>
              <div>
                <h3 className="text-lg font-medium">TikTok</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {apiCredentials.tiktok ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>

            <Toggle
              checked={platformsEnabled.tiktok}
              onChange={(checked) => togglePlatform('tiktok', checked)}
              disabled={!apiCredentials.tiktok}
            />
          </div>

          {apiCredentials.tiktok ? (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Your TikTok account is connected. You can disconnect at any time.
              </p>
              <Button
                variant="outline"
                onClick={() => handleClearCredentials('tiktok')}
                size="sm"
              >
                Disconnect Account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleTiktokSubmit} className="space-y-4">
              <Input
                label="API Base URL"
                value={tiktokBaseUrl}
                onChange={(e) => setTiktokBaseUrl(e.target.value)}
                placeholder="https://open-api.tiktok.com/v2"
              />

              <Input
                label="Access Token"
                value={tiktokToken}
                onChange={(e) => setTiktokToken(e.target.value)}
                placeholder="Enter your TikTok access token"
                type="password"
              />

              <p className="text-xs text-gray-500 dark:text-gray-400">
                You can get your access token from the TikTok Developer Portal.
                <a
                  href="https://developers.tiktok.com/doc/login-kit-web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Learn more
                </a>
              </p>

              {errors.tiktok && (
                <div className="flex items-center text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={16} className="mr-1" />
                  {errors.tiktok}
                </div>
              )}

              {successMessages.tiktok && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle size={16} className="mr-1" />
                  {successMessages.tiktok}
                </div>
              )}

              <Button
                type="submit"
                disabled={savingPlatform === 'tiktok'}
              >
                {savingPlatform === 'tiktok' ? 'Saving...' : 'Save Credentials'}
              </Button>
            </form>
          )}
        </Card>

        {/* App Settings */}
        <Card title="Application Settings">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Theme</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You can change the theme from the toggle in the top bar
              </p>
            </div>

            <div>
              <h3 className="font-medium mb-2">About</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Social Media Automation Tool v1.0.0
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                A tool for scheduling and managing posts across multiple social media platforms
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;