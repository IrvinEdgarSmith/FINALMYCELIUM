export interface Settings {
  systemPrompt: string;
  apiKey: string;
  searchModel: string;
  model: string;
  memoryModel: string;
  braveApiKey: string;
  notionKey?: string;
}

export class SettingsEntity implements Settings {
  constructor(
    public systemPrompt: string = "You are a helpful AI assistant. Be concise and clear in your responses.",
    public apiKey: string = "",
    public searchModel: string = "",
    public model: string = "anthropic/claude-2",
    public memoryModel: string = "anthropic/claude-2",
    public braveApiKey: string = "",
    public notionKey?: string
  ) {}

  static createDefault(): SettingsEntity {
    return new SettingsEntity();
  }

  update(updates: Partial<Settings>): void {
    Object.assign(this, updates);
  }

  validate(): boolean {
    return (
      typeof this.systemPrompt === 'string' &&
      typeof this.apiKey === 'string' &&
      typeof this.model === 'string' &&
      this.apiKey.length > 0
    );
  }
}
