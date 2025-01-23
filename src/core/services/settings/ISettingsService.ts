import { Settings } from '../../domain/Settings';

export interface ISettingsService {
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<Settings>): Promise<void>;
  resetSettings(): Promise<void>;
}
