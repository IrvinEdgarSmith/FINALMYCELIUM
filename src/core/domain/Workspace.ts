import { Thread } from './Thread';

export interface Workspace {
  id: string;
  name: string;
  threads: Thread[];
  createdAt: number;
  model?: string;
}

export class WorkspaceEntity implements Workspace {
  constructor(
    public id: string = crypto.randomUUID(),
    public name: string,
    public threads: Thread[] = [],
    public createdAt: number = Date.now(),
    public model?: string
  ) {}

  addThread(thread: Thread): void {
    this.threads.push(thread);
  }

  removeThread(threadId: string): void {
    this.threads = this.threads.filter(t => t.id !== threadId);
  }

  updateName(name: string): void {
    this.name = name;
  }

  updateModel(model: string): void {
    this.model = model;
  }

  getThread(threadId: string): Thread | undefined {
    return this.threads.find(t => t.id === threadId);
  }

  static create(name: string = 'New Workspace'): WorkspaceEntity {
    return new WorkspaceEntity(crypto.randomUUID(), name);
  }
}
