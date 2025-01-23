import { injectable, inject } from 'inversify';
import { TYPES } from '../../di/types';
import { ISettingsService } from './ISettingsService';
import { IStorageService } from '../storage/IStorageService';
import { Settings, SettingsEntity } from '../../domain/Settings';

const SETTINGS_STORAGE_KEY = 'nexus-chat-settings';

@injectable()
export class SettingsService implements ISettingsService {
  constructor(
    @inject(TYPES.StorageService) private storageService: IStorageService
  ) {}

  async getSettings(): Promise<Settings> {
    const settings = await this.storageService.get<Settings>(SETTINGS_STORAGE_KEY);
    return settings || SettingsEntity.createDefault();
  }

  async updateSettings(updates: Partial<Settings>): Promise<void> {
    const currentSettings = await this.getSettings();
    const updatedSettings = new SettingsEntity();
    Object.assign(updatedSettings, currentSettings, updates);

    if (!updatedSettings.validate()) {
      throw new Error('Invalid settings');
    }

    await this.storageService.set(SETTINGS_STORAGE_KEY, updatedSettings);
  }

  async resetSettings(): Promise<void> {
    const defaultSettings = SettingsEntity.createDefault();
    await this.storageService.set(SETTINGS_STORAGE_KEY, defaultSettings);
  }
}
