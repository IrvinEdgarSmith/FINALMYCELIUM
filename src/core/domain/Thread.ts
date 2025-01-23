import { Message } from './Message';

export interface Thread {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
}

export class ThreadEntity implements Thread {
  constructor(
    public id: string = crypto.randomUUID(),
    public name: string,
    public messages: Message[] = [],
    public createdAt: number = Date.now()
  ) {}

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  updateName(name: string): void {
    this.name = name;
  }

  static create(name: string = 'New Thread'): ThreadEntity {
    return new ThreadEntity(crypto.randomUUID(), name);
  }
}
