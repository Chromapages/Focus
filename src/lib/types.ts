export type InboxKind = 'task' | 'note' | 'snippet';

export type InboxItem = {
  id: string;
  kind: InboxKind;
  text: string;
  createdAt: number; // ms
  archivedAt?: number;
};

export type Task = {
  id: string;
  title: string;
  createdAt: number;
  dueAt?: number; // ms
  status: 'open' | 'done' | 'waiting';
  priority?: 'low' | 'med' | 'high';
};
