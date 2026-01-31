export type ChromaAppId = 'focus' | 'dynamic-qr' | 'nano-banana' | (string & {});

export type ChromaCommandName =
  | 'quick_capture'
  | 'open_url'
  | 'create_qr'
  | 'generate_image'
  | 'noop'
  | (string & {});

export type ChromaCommandEnvelope<TPayload = unknown> = {
  id: string; // client-generated UUID
  name: ChromaCommandName;
  sourceApp: ChromaAppId;
  issuedAt: string; // ISO
  userId?: string; // optional when service-to-service
  payload: TPayload;
};

export type ChromaCommandResult<T = unknown> = {
  ok: boolean;
  commandId: string;
  handledBy: ChromaAppId;
  result?: T;
  error?: string;
};
