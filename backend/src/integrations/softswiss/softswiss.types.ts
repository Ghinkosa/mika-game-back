export type SoftSwissAction = 'play' | 'rollback' | 'freespins';

export interface SoftSwissPlayPayload {
  action: 'play';
  user_id: string;
  currency: string;
  game: string;
  game_id: string;
  session_id?: string;
  round_id?: string;
  bet?: string; // String with up to 18 digits integer and 12 digits fraction
  win?: string; // String with up to 18 digits integer and 12 digits fraction
  session_payload?: string;
  finished?: boolean;
}

export interface SoftSwissRollbackPayload {
  action: 'rollback';
  user_id: string;
  currency: string;
  game: string;
  game_id: string;
  transaction_id: string;
  original_action_id?: string;
  round_id?: string;
}

export interface SoftSwissResponse {
  balance: string; // 12-decimal string representation
  transaction_id?: string;
}

export interface SoftSwissErrorResponse {
  code: number;
  message: string;
}
