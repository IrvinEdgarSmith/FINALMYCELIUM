# NexusChat Core Architecture

## Overview
This module contains the core business logic and domain entities for the NexusChat application, following clean architecture principles and SOLID design patterns.

## Structure

```
core/
├── di/              # Dependency injection setup
├── domain/          # Core domain entities and interfaces
├── services/        # Core business logic services
│   ├── message/     # Message handling
│   ├── memory/      # Memory and knowledge management
│   ├── notion/      # Notion integration
│   ├── search/      # Search functionality
│   ├── settings/    # Application settings
│   ├── storage/     # Data persistence
│   └── workspace/   # Workspace management
└── utils/           # Shared utilities and helpers
```

## Key Components

### Domain Entities
- `Message`: Represents chat messages
- `Thread`: Collection of related messages
- `Workspace`: Organizational unit containing threads
- `Settings`: Application configuration

### Core Services
- `MessageService`: Handles message processing and chat interactions
- `MemoryService`: Manages knowledge extraction and relationships
- `WorkspaceService`: Handles workspace and thread organization
- `SettingsService`: Manages application settings
- `StorageService`: Handles data persistence

### Integration Services
- `NotionService`: Manages Notion integration
- `SearchService`: Handles web search functionality

## Dependency Injection

The application uses Inversify for dependency injection. Service interfaces are defined in each service directory and implementations are registered in `di/container.ts`.

### Service Registration
```typescript
container.bind<IStorageService>(TYPES.StorageService)
         .to(LocalStorageService)
         .inSingletonScope();
```

## Usage

1. Import the container and types:
```typescript
import { container } from './core/di/container';
import { TYPES } from './core/di/types';
```

2. Resolve services:
```typescript
const settingsService = container.get<ISettingsService>(TYPES.SettingsService);
```

## Error Handling

Services use typed errors and proper error handling patterns. Example:
```typescript
try {
  await settingsService.updateSettings(newSettings);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation error
  }
  // Handle other errors
}
```

## Best Practices

1. Always use interfaces for service dependencies
2. Maintain single responsibility principle
3. Use dependency injection
4. Handle errors appropriately
5. Write pure functions where possible
6. Document public interfaces
