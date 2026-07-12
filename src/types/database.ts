/**
 * Hand-written mirror of the Supabase schema (see supabase/migrations).
 * Regenerate with `supabase gen types typescript` once a live project exists
 * and swap this file for the generated one if desired.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          avatar_url: string | null
          is_online: boolean
          last_seen: string
          created_at: string
        }
        Insert: {
          id: string
          username: string
          avatar_url?: string | null
          is_online?: boolean
          last_seen?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      rooms: {
        Row: {
          id: string
          room_number: string
          invite_code: string
          host_id: string
          status: 'waiting' | 'in_progress' | 'completed'
          max_players: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_number: string
          invite_code: string
          host_id: string
          status?: 'waiting' | 'in_progress' | 'completed'
          max_players?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>
        Relationships: []
      }
      room_players: {
        Row: {
          id: string
          room_id: string
          player_id: string
          seat: number
          is_host: boolean
          is_connected: boolean
          joined_at: string
          left_at: string | null
          total_score: number
          win_streak: number
        }
        Insert: {
          id?: string
          room_id: string
          player_id: string
          seat: number
          is_host?: boolean
          is_connected?: boolean
          joined_at?: string
          left_at?: string | null
          total_score?: number
          win_streak?: number
        }
        Update: Partial<Database['public']['Tables']['room_players']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'room_players_player_id_fkey'
            columns: ['player_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      games: {
        Row: {
          id: string
          room_id: string
          status: 'dealing' | 'playing' | 'fight' | 'finished'
          current_turn_player_id: string | null
          turn_number: number
          has_drawn_this_turn: boolean
          version: number
          deck: Json
          discard_pile: Json
          dealer_id: string
          winner_id: string | null
          win_type: 'meld_out' | 'tongits' | 'fight' | 'draw' | null
          started_at: string
          ended_at: string | null
          turn_deadline: string | null
        }
        Insert: {
          id?: string
          room_id: string
          status?: 'dealing' | 'playing' | 'fight' | 'finished'
          current_turn_player_id?: string | null
          turn_number?: number
          has_drawn_this_turn?: boolean
          version?: number
          deck: Json
          discard_pile?: Json
          dealer_id: string
          winner_id?: string | null
          win_type?: 'meld_out' | 'tongits' | 'fight' | 'draw' | null
          started_at?: string
          ended_at?: string | null
          turn_deadline?: string | null
        }
        Update: Partial<Database['public']['Tables']['games']['Insert']>
        Relationships: []
      }
      game_players: {
        Row: {
          id: string
          game_id: string
          player_id: string
          seat: number
          hand_count: number
          score: number
          is_connected: boolean
          has_discarded: boolean
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          seat: number
          hand_count?: number
          score?: number
          is_connected?: boolean
          has_discarded?: boolean
        }
        Update: Partial<Database['public']['Tables']['game_players']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'game_players_player_id_fkey'
            columns: ['player_id']
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      player_hands: {
        Row: {
          game_id: string
          player_id: string
          cards: Json
          updated_at: string
        }
        Insert: {
          game_id: string
          player_id: string
          cards: Json
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['player_hands']['Insert']>
        Relationships: []
      }
      melds: {
        Row: {
          id: string
          game_id: string
          owner_id: string
          type: 'set' | 'run'
          cards: Json
          is_sapaw: boolean
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          owner_id: string
          type: 'set' | 'run'
          cards: Json
          is_sapaw?: boolean
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['melds']['Insert']>
        Relationships: []
      }
      moves: {
        Row: {
          id: string
          game_id: string
          player_id: string
          action: string
          payload: Json
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_id: string
          action: string
          payload: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['moves']['Insert']>
        Relationships: []
      }
      game_results: {
        Row: {
          id: string
          game_id: string
          results: Json
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          results: Json
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['game_results']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      apply_game_action: {
        Args: {
          p_game_id: string
          p_expected_version: number
          p_patch: Json
        }
        Returns: Json
      }
      start_game: {
        Args: {
          p_room_id: string
          p_dealer_id: string
          p_deck: Json
          p_hands: Json
        }
        Returns: string
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
