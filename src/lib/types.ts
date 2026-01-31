export type InboxKind = 'task' | 'note' | 'snippet';

export type InboxItem = {
  id: string;
  kind: InboxKind;
  text: string;
  createdAt: number; // ms
  archivedAt?: number;
  convertedTo?: InboxKind;
  convertedAt?: number;
};

export type TaskStatus = 'open' | 'done' | 'waiting';

export type Task = {
  id: string;
  title: string;
  createdAt: number;
  dueAt?: number; // ms
  status: TaskStatus;
  priority?: 'low' | 'med' | 'high';
};

export type Note = {
  id: string;
  title?: string;
  body: string;
  createdAt: number;
  updatedAt?: number;
};

export type Snippet = {
  id: string;
  title?: string;
  body: string;
  createdAt: number;
};
