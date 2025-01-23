import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from './types';
import { MessageService } from '../services/message/MessageService';
import { IMessageService } from '../services/message/IMessageService';
import { IWorkspaceService } from '../services/workspace/IWorkspaceService';
import { WorkspaceService } from '../services/workspace/WorkspaceService';
import { INotionService } from '../services/notion/INotionService';
import { NotionService } from '../services/notion/NotionService';
import { IMemoryService } from '../services/memory/IMemoryService';
import { MemoryService } from '../services/memory/MemoryService';
import { ISearchService } from '../services/search/ISearchService';
import { SearchService } from '../services/search/SearchService';
import { ISettingsService } from '../services/settings/ISettingsService';
import { SettingsService } from '../services/settings/SettingsService';
import { IStorageService } from '../services/storage/IStorageService';
import { LocalStorageService } from '../services/storage/LocalStorageService';

const container = new Container();

// Storage
container.bind<IStorageService>(TYPES.StorageService).to(LocalStorageService).inSingletonScope();

// Core Services
container.bind<ISettingsService>(TYPES.SettingsService).to(SettingsService).inSingletonScope();
container.bind<IWorkspaceService>(TYPES.WorkspaceService).to(WorkspaceService).inSingletonScope();
container.bind<IMessageService>(TYPES.MessageService).to(MessageService).inSingletonScope();
container.bind<IMemoryService>(TYPES.MemoryService).to(MemoryService).inSingletonScope();

// Integration Services
container.bind<INotionService>(TYPES.NotionService).to(NotionService).inSingletonScope();
container.bind<ISearchService>(TYPES.SearchService).to(SearchService).inSingletonScope();

export { container };
