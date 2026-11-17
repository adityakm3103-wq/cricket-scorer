export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      batting_scorecards: {
        Row: {
          balls: number
          batting_order: number
          bowler_id: string | null
          created_at: string
          dismissal_text: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id: string | null
          fours: number
          id: string
          innings_id: string
          not_out: boolean
          player_id: string
          runs: number
          sixes: number
          strike_rate: number
          updated_at: string
        }
        Insert: {
          balls?: number
          batting_order?: number
          bowler_id?: string | null
          created_at?: string
          dismissal_text?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id?: string | null
          fours?: number
          id?: string
          innings_id: string
          not_out?: boolean
          player_id: string
          runs?: number
          sixes?: number
          strike_rate?: number
          updated_at?: string
        }
        Update: {
          balls?: number
          batting_order?: number
          bowler_id?: string | null
          created_at?: string
          dismissal_text?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id?: string | null
          fours?: number
          id?: string
          innings_id?: string
          not_out?: boolean
          player_id?: string
          runs?: number
          sixes?: number
          strike_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "batting_scorecards_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batting_scorecards_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batting_scorecards_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batting_scorecards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      bowling_scorecards: {
        Row: {
          bowling_order: number
          created_at: string
          economy: number
          id: string
          innings_id: string
          legal_balls: number
          maidens: number
          no_balls: number
          overs_text: string
          player_id: string
          runs_conceded: number
          updated_at: string
          wickets: number
          wides: number
        }
        Insert: {
          bowling_order?: number
          created_at?: string
          economy?: number
          id?: string
          innings_id: string
          legal_balls?: number
          maidens?: number
          no_balls?: number
          overs_text?: string
          player_id: string
          runs_conceded?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Update: {
          bowling_order?: number
          created_at?: string
          economy?: number
          id?: string
          innings_id?: string
          legal_balls?: number
          maidens?: number
          no_balls?: number
          overs_text?: string
          player_id?: string
          runs_conceded?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "bowling_scorecards_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bowling_scorecards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          ball_number: number
          batter_runs: number
          bowler_credited: boolean
          bowler_id: string
          created_at: string
          dismissal_type: Database["public"]["Enums"]["dismissal_type"] | null
          dismissed_player_id: string | null
          extra_runs: number
          extra_type: Database["public"]["Enums"]["extra_type"]
          fielder_id: string | null
          id: string
          incoming_batter_id: string | null
          innings_id: string
          is_legal_delivery: boolean
          is_wicket: boolean
          non_striker_id: string
          over_number: number
          prev_bowler_id: string | null
          prev_non_striker_id: string | null
          prev_striker_id: string | null
          runs_completed_before_dismissal: number
          strike_rotated: boolean
          striker_id: string
          total_runs: number
        }
        Insert: {
          ball_number: number
          batter_runs?: number
          bowler_credited?: boolean
          bowler_id: string
          created_at?: string
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          dismissed_player_id?: string | null
          extra_runs?: number
          extra_type?: Database["public"]["Enums"]["extra_type"]
          fielder_id?: string | null
          id?: string
          incoming_batter_id?: string | null
          innings_id: string
          is_legal_delivery?: boolean
          is_wicket?: boolean
          non_striker_id: string
          over_number: number
          prev_bowler_id?: string | null
          prev_non_striker_id?: string | null
          prev_striker_id?: string | null
          runs_completed_before_dismissal?: number
          strike_rotated?: boolean
          striker_id: string
          total_runs?: number
        }
        Update: {
          ball_number?: number
          batter_runs?: number
          bowler_credited?: boolean
          bowler_id?: string
          created_at?: string
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          dismissed_player_id?: string | null
          extra_runs?: number
          extra_type?: Database["public"]["Enums"]["extra_type"]
          fielder_id?: string | null
          id?: string
          incoming_batter_id?: string | null
          innings_id?: string
          is_legal_delivery?: boolean
          is_wicket?: boolean
          non_striker_id?: string
          over_number?: number
          prev_bowler_id?: string | null
          prev_non_striker_id?: string | null
          prev_striker_id?: string | null
          runs_completed_before_dismissal?: number
          strike_rotated?: boolean
          striker_id?: string
          total_runs?: number
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_dismissed_player_id_fkey"
            columns: ["dismissed_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_incoming_batter_id_fkey"
            columns: ["incoming_batter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_non_striker_id_fkey"
            columns: ["non_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_prev_bowler_id_fkey"
            columns: ["prev_bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_prev_non_striker_id_fkey"
            columns: ["prev_non_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_prev_striker_id_fkey"
            columns: ["prev_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_striker_id_fkey"
            columns: ["striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_batting_scorecards: {
        Row: {
          balls: number
          batting_order: number
          bowler_id: string | null
          created_at: string
          dismissal_text: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id: string | null
          fours: number
          id: string
          innings_id: string
          not_out: boolean
          player_id: string
          runs: number
          sixes: number
          strike_rate: number
          updated_at: string
        }
        Insert: {
          balls?: number
          batting_order?: number
          bowler_id?: string | null
          created_at?: string
          dismissal_text?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id?: string | null
          fours?: number
          id?: string
          innings_id: string
          not_out?: boolean
          player_id: string
          runs?: number
          sixes?: number
          strike_rate?: number
          updated_at?: string
        }
        Update: {
          balls?: number
          batting_order?: number
          bowler_id?: string | null
          created_at?: string
          dismissal_text?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          fielder_id?: string | null
          fours?: number
          id?: string
          innings_id?: string
          not_out?: boolean
          player_id?: string
          runs?: number
          sixes?: number
          strike_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gully_batting_scorecards_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_batting_scorecards_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_batting_scorecards_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "gully_innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_batting_scorecards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_bowling_scorecards: {
        Row: {
          allocated_overs: number
          bowling_order: number
          created_at: string
          economy: number
          id: string
          innings_id: string
          legal_balls: number
          maidens: number
          no_balls: number
          overs_text: string
          player_id: string
          runs_conceded: number
          updated_at: string
          wickets: number
          wides: number
        }
        Insert: {
          allocated_overs?: number
          bowling_order?: number
          created_at?: string
          economy?: number
          id?: string
          innings_id: string
          legal_balls?: number
          maidens?: number
          no_balls?: number
          overs_text?: string
          player_id: string
          runs_conceded?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Update: {
          allocated_overs?: number
          bowling_order?: number
          created_at?: string
          economy?: number
          id?: string
          innings_id?: string
          legal_balls?: number
          maidens?: number
          no_balls?: number
          overs_text?: string
          player_id?: string
          runs_conceded?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "gully_bowling_scorecards_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "gully_innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_bowling_scorecards_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_deliveries: {
        Row: {
          ball_number: number
          batter_runs: number
          bowler_credited: boolean
          bowler_id: string
          created_at: string
          dismissal_type: Database["public"]["Enums"]["dismissal_type"] | null
          dismissed_player_id: string | null
          extra_runs: number
          extra_type: Database["public"]["Enums"]["extra_type"]
          fielder_id: string | null
          id: string
          incoming_batter_id: string | null
          innings_id: string
          is_legal_delivery: boolean
          is_wicket: boolean
          non_striker_id: string | null
          over_number: number
          prev_bowler_id: string | null
          prev_non_striker_id: string | null
          prev_striker_id: string | null
          runs_completed_before_dismissal: number
          strike_rotated: boolean
          striker_id: string
          total_runs: number
        }
        Insert: {
          ball_number: number
          batter_runs?: number
          bowler_credited?: boolean
          bowler_id: string
          created_at?: string
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          dismissed_player_id?: string | null
          extra_runs?: number
          extra_type?: Database["public"]["Enums"]["extra_type"]
          fielder_id?: string | null
          id?: string
          incoming_batter_id?: string | null
          innings_id: string
          is_legal_delivery?: boolean
          is_wicket?: boolean
          non_striker_id?: string | null
          over_number: number
          prev_bowler_id?: string | null
          prev_non_striker_id?: string | null
          prev_striker_id?: string | null
          runs_completed_before_dismissal?: number
          strike_rotated?: boolean
          striker_id: string
          total_runs?: number
        }
        Update: {
          ball_number?: number
          batter_runs?: number
          bowler_credited?: boolean
          bowler_id?: string
          created_at?: string
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"] | null
          dismissed_player_id?: string | null
          extra_runs?: number
          extra_type?: Database["public"]["Enums"]["extra_type"]
          fielder_id?: string | null
          id?: string
          incoming_batter_id?: string | null
          innings_id?: string
          is_legal_delivery?: boolean
          is_wicket?: boolean
          non_striker_id?: string | null
          over_number?: number
          prev_bowler_id?: string | null
          prev_non_striker_id?: string | null
          prev_striker_id?: string | null
          runs_completed_before_dismissal?: number
          strike_rotated?: boolean
          striker_id?: string
          total_runs?: number
        }
        Relationships: [
          {
            foreignKeyName: "gully_deliveries_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_dismissed_player_id_fkey"
            columns: ["dismissed_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_incoming_batter_id_fkey"
            columns: ["incoming_batter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "gully_innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_non_striker_id_fkey"
            columns: ["non_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_prev_bowler_id_fkey"
            columns: ["prev_bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_prev_non_striker_id_fkey"
            columns: ["prev_non_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_prev_striker_id_fkey"
            columns: ["prev_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_deliveries_striker_id_fkey"
            columns: ["striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_innings: {
        Row: {
          batter_id: string | null
          batting_team_name: string
          batting_temp_team_id: string | null
          bowling_team_name: string
          bowling_temp_team_id: string | null
          byes: number
          created_at: string
          current_bowler_id: string | null
          current_non_striker_id: string | null
          current_striker_id: string | null
          gully_match_id: string
          id: string
          innings_number: number
          last_bowler_id: string | null
          leg_byes: number
          legal_balls: number
          no_balls: number
          overs_completed_text: string
          penalty_runs: number
          round_number: number
          status: Database["public"]["Enums"]["innings_status"]
          target_runs: number | null
          total_runs: number
          updated_at: string
          wickets: number
          wides: number
        }
        Insert: {
          batter_id?: string | null
          batting_team_name: string
          batting_temp_team_id?: string | null
          bowling_team_name: string
          bowling_temp_team_id?: string | null
          byes?: number
          created_at?: string
          current_bowler_id?: string | null
          current_non_striker_id?: string | null
          current_striker_id?: string | null
          gully_match_id: string
          id?: string
          innings_number: number
          last_bowler_id?: string | null
          leg_byes?: number
          legal_balls?: number
          no_balls?: number
          overs_completed_text?: string
          penalty_runs?: number
          round_number?: number
          status?: Database["public"]["Enums"]["innings_status"]
          target_runs?: number | null
          total_runs?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Update: {
          batter_id?: string | null
          batting_team_name?: string
          batting_temp_team_id?: string | null
          bowling_team_name?: string
          bowling_temp_team_id?: string | null
          byes?: number
          created_at?: string
          current_bowler_id?: string | null
          current_non_striker_id?: string | null
          current_striker_id?: string | null
          gully_match_id?: string
          id?: string
          innings_number?: number
          last_bowler_id?: string | null
          leg_byes?: number
          legal_balls?: number
          no_balls?: number
          overs_completed_text?: string
          penalty_runs?: number
          round_number?: number
          status?: Database["public"]["Enums"]["innings_status"]
          target_runs?: number | null
          total_runs?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "gully_innings_batter_id_fkey"
            columns: ["batter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_innings_batting_temp_team_id_fkey"
            columns: ["batting_temp_team_id"]
            isOneToOne: false
            referencedRelation: "gully_temporary_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_innings_bowling_temp_team_id_fkey"
            columns: ["bowling_temp_team_id"]
            isOneToOne: false
            referencedRelation: "gully_temporary_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_innings_current_bowler_id_fkey"
            columns: ["current_bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_innings_current_non_striker_id_fkey"
            columns: ["current_non_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_innings_current_striker_id_fkey"
            columns: ["current_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_innings_gully_match_id_fkey"
            columns: ["gully_match_id"]
            isOneToOne: false
            referencedRelation: "gully_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_innings_last_bowler_id_fkey"
            columns: ["last_bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_match_players: {
        Row: {
          allocated_overs: number
          batting_order: number | null
          bowling_order: number | null
          gully_match_id: string
          id: string
          is_batter: boolean
          is_bowler: boolean
          is_playing: boolean
          player_id: string
          temporary_team_id: string | null
        }
        Insert: {
          allocated_overs?: number
          batting_order?: number | null
          bowling_order?: number | null
          gully_match_id: string
          id?: string
          is_batter?: boolean
          is_bowler?: boolean
          is_playing?: boolean
          player_id: string
          temporary_team_id?: string | null
        }
        Update: {
          allocated_overs?: number
          batting_order?: number | null
          bowling_order?: number | null
          gully_match_id?: string
          id?: string
          is_batter?: boolean
          is_bowler?: boolean
          is_playing?: boolean
          player_id?: string
          temporary_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gully_match_players_gully_match_id_fkey"
            columns: ["gully_match_id"]
            isOneToOne: false
            referencedRelation: "gully_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_match_players_temporary_team_id_fkey"
            columns: ["temporary_team_id"]
            isOneToOne: false
            referencedRelation: "gully_temporary_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_matches: {
        Row: {
          bowler_order_rule:
            | Database["public"]["Enums"]["bowler_order_rule"]
            | null
          bowling_allocation_rule: Database["public"]["Enums"]["bowling_allocation_rule"]
          created_at: string
          current_innings_number: number
          current_round_number: number
          draft_shuffled: boolean
          id: string
          match_date: string
          match_type: Database["public"]["Enums"]["gully_match_type"]
          players_per_team: number | null
          registered_team_id: string
          result_description: string | null
          result_type: Database["public"]["Enums"]["match_result_type"] | null
          selected_batter_id: string | null
          singles_batting_order: string | null
          singles_dismissal_rule:
            | Database["public"]["Enums"]["singles_dismissal_rule"]
            | null
          status: Database["public"]["Enums"]["match_status"]
          toss_decision: Database["public"]["Enums"]["toss_decision"] | null
          toss_winner_team_id: string | null
          total_overs: number
          updated_at: string
          venue: string | null
          winner_name: string | null
        }
        Insert: {
          bowler_order_rule?:
            | Database["public"]["Enums"]["bowler_order_rule"]
            | null
          bowling_allocation_rule?: Database["public"]["Enums"]["bowling_allocation_rule"]
          created_at?: string
          current_innings_number?: number
          current_round_number?: number
          draft_shuffled?: boolean
          id?: string
          match_date?: string
          match_type: Database["public"]["Enums"]["gully_match_type"]
          players_per_team?: number | null
          registered_team_id: string
          result_description?: string | null
          result_type?: Database["public"]["Enums"]["match_result_type"] | null
          selected_batter_id?: string | null
          singles_batting_order?: string | null
          singles_dismissal_rule?:
            | Database["public"]["Enums"]["singles_dismissal_rule"]
            | null
          status?: Database["public"]["Enums"]["match_status"]
          toss_decision?: Database["public"]["Enums"]["toss_decision"] | null
          toss_winner_team_id?: string | null
          total_overs?: number
          updated_at?: string
          venue?: string | null
          winner_name?: string | null
        }
        Update: {
          bowler_order_rule?:
            | Database["public"]["Enums"]["bowler_order_rule"]
            | null
          bowling_allocation_rule?: Database["public"]["Enums"]["bowling_allocation_rule"]
          created_at?: string
          current_innings_number?: number
          current_round_number?: number
          draft_shuffled?: boolean
          id?: string
          match_date?: string
          match_type?: Database["public"]["Enums"]["gully_match_type"]
          players_per_team?: number | null
          registered_team_id?: string
          result_description?: string | null
          result_type?: Database["public"]["Enums"]["match_result_type"] | null
          selected_batter_id?: string | null
          singles_batting_order?: string | null
          singles_dismissal_rule?:
            | Database["public"]["Enums"]["singles_dismissal_rule"]
            | null
          status?: Database["public"]["Enums"]["match_status"]
          toss_decision?: Database["public"]["Enums"]["toss_decision"] | null
          toss_winner_team_id?: string | null
          total_overs?: number
          updated_at?: string
          venue?: string | null
          winner_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gully_matches_registered_team_id_fkey"
            columns: ["registered_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_matches_selected_batter_id_fkey"
            columns: ["selected_batter_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_temporary_teams: {
        Row: {
          captain_player_id: string | null
          created_at: string
          gully_match_id: string
          id: string
          is_team_a: boolean
          team_name: string
        }
        Insert: {
          captain_player_id?: string | null
          created_at?: string
          gully_match_id: string
          id?: string
          is_team_a?: boolean
          team_name: string
        }
        Update: {
          captain_player_id?: string | null
          created_at?: string
          gully_match_id?: string
          id?: string
          is_team_a?: boolean
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "gully_temporary_teams_captain_player_id_fkey"
            columns: ["captain_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_temporary_teams_gully_match_id_fkey"
            columns: ["gully_match_id"]
            isOneToOne: false
            referencedRelation: "gully_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      gully_wickets: {
        Row: {
          bowler_credited: boolean
          bowler_id: string | null
          created_at: string
          delivery_id: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"]
          fielder_id: string | null
          id: string
          innings_id: string
          over_ball_text: string
          player_id: string
          team_runs_at_fall: number
          wicket_number: number
        }
        Insert: {
          bowler_credited?: boolean
          bowler_id?: string | null
          created_at?: string
          delivery_id?: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"]
          fielder_id?: string | null
          id?: string
          innings_id: string
          over_ball_text: string
          player_id: string
          team_runs_at_fall: number
          wicket_number: number
        }
        Update: {
          bowler_credited?: boolean
          bowler_id?: string | null
          created_at?: string
          delivery_id?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"]
          fielder_id?: string | null
          id?: string
          innings_id?: string
          over_ball_text?: string
          player_id?: string
          team_runs_at_fall?: number
          wicket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "gully_wickets_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_wickets_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "gully_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_wickets_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_wickets_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "gully_innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gully_wickets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      innings: {
        Row: {
          batting_team_id: string
          bowling_team_id: string
          byes: number
          created_at: string
          current_bowler_id: string | null
          current_non_striker_id: string | null
          current_striker_id: string | null
          id: string
          innings_number: number
          is_declared: boolean
          last_bowler_id: string | null
          leg_byes: number
          legal_balls: number
          match_id: string
          no_balls: number
          overs_completed_text: string
          penalty_runs: number
          status: Database["public"]["Enums"]["innings_status"]
          target_runs: number | null
          total_runs: number
          updated_at: string
          wickets: number
          wides: number
        }
        Insert: {
          batting_team_id: string
          bowling_team_id: string
          byes?: number
          created_at?: string
          current_bowler_id?: string | null
          current_non_striker_id?: string | null
          current_striker_id?: string | null
          id?: string
          innings_number: number
          is_declared?: boolean
          last_bowler_id?: string | null
          leg_byes?: number
          legal_balls?: number
          match_id: string
          no_balls?: number
          overs_completed_text?: string
          penalty_runs?: number
          status?: Database["public"]["Enums"]["innings_status"]
          target_runs?: number | null
          total_runs?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Update: {
          batting_team_id?: string
          bowling_team_id?: string
          byes?: number
          created_at?: string
          current_bowler_id?: string | null
          current_non_striker_id?: string | null
          current_striker_id?: string | null
          id?: string
          innings_number?: number
          is_declared?: boolean
          last_bowler_id?: string | null
          leg_byes?: number
          legal_balls?: number
          match_id?: string
          no_balls?: number
          overs_completed_text?: string
          penalty_runs?: number
          status?: Database["public"]["Enums"]["innings_status"]
          target_runs?: number | null
          total_runs?: number
          updated_at?: string
          wickets?: number
          wides?: number
        }
        Relationships: [
          {
            foreignKeyName: "innings_batting_team_id_fkey"
            columns: ["batting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_bowling_team_id_fkey"
            columns: ["bowling_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_current_bowler_id_fkey"
            columns: ["current_bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_current_non_striker_id_fkey"
            columns: ["current_non_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_current_striker_id_fkey"
            columns: ["current_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_last_bowler_id_fkey"
            columns: ["last_bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "innings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          id: string
          is_playing_xi: boolean
          match_id: string
          player_id: string
          team_id: string
        }
        Insert: {
          id?: string
          is_playing_xi?: boolean
          match_id: string
          player_id: string
          team_id: string
        }
        Update: {
          id?: string
          is_playing_xi?: boolean
          match_id?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_sessions: {
        Row: {
          created_at: string
          day_number: number
          id: string
          match_id: string
          overs_bowled: number
          runs_scored: number
          session_number: number
          status: string
          wickets_fallen: number
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          match_id: string
          overs_bowled?: number
          runs_scored?: number
          session_number: number
          status?: string
          wickets_fallen?: number
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          match_id?: string
          overs_bowled?: number
          runs_scored?: number
          session_number?: number
          status?: string
          wickets_fallen?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_sessions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          created_at: string
          current_day: number
          current_innings_number: number
          current_session: number
          day_overs: number
          follow_on_enforced: boolean
          format: Database["public"]["Enums"]["match_format"]
          id: string
          match_date: string
          result_description: string | null
          result_type: Database["public"]["Enums"]["match_result_type"] | null
          session_overs: number
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string
          team_b_id: string
          toss_decision: Database["public"]["Enums"]["toss_decision"] | null
          toss_winner_id: string | null
          updated_at: string
          venue: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          current_day?: number
          current_innings_number?: number
          current_session?: number
          day_overs?: number
          follow_on_enforced?: boolean
          format: Database["public"]["Enums"]["match_format"]
          id?: string
          match_date: string
          result_description?: string | null
          result_type?: Database["public"]["Enums"]["match_result_type"] | null
          session_overs?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id: string
          team_b_id: string
          toss_decision?: Database["public"]["Enums"]["toss_decision"] | null
          toss_winner_id?: string | null
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          current_day?: number
          current_innings_number?: number
          current_session?: number
          day_overs?: number
          follow_on_enforced?: boolean
          format?: Database["public"]["Enums"]["match_format"]
          id?: string
          match_date?: string
          result_description?: string | null
          result_type?: Database["public"]["Enums"]["match_result_type"] | null
          session_overs?: number
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string
          team_b_id?: string
          toss_decision?: Database["public"]["Enums"]["toss_decision"] | null
          toss_winner_id?: string | null
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_toss_winner_id_fkey"
            columns: ["toss_winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          balls: number
          batter_one_id: string
          batter_two_id: string
          id: string
          innings_id: string
          runs: number
          wicket_number: number
        }
        Insert: {
          balls?: number
          batter_one_id: string
          batter_two_id: string
          id?: string
          innings_id: string
          runs?: number
          wicket_number: number
        }
        Update: {
          balls?: number
          batter_one_id?: string
          batter_two_id?: string
          id?: string
          innings_id?: string
          runs?: number
          wicket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "partnerships_batter_one_id_fkey"
            columns: ["batter_one_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnerships_batter_two_id_fkey"
            columns: ["batter_two_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnerships_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          jersey_number: number
          player_name: string
          role: Database["public"]["Enums"]["player_role"]
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          jersey_number: number
          player_name: string
          role: Database["public"]["Enums"]["player_role"]
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          jersey_number?: number
          player_name?: string
          role?: Database["public"]["Enums"]["player_role"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["user_role"]
          team_name: string
          updated_at: string
          username: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          team_name: string
          updated_at?: string
          username: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          team_name?: string
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      wickets: {
        Row: {
          bowler_credited: boolean
          bowler_id: string | null
          created_at: string
          delivery_id: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"]
          fielder_id: string | null
          id: string
          innings_id: string
          over_ball_text: string
          player_id: string
          team_runs_at_fall: number
          wicket_number: number
        }
        Insert: {
          bowler_credited?: boolean
          bowler_id?: string | null
          created_at?: string
          delivery_id?: string | null
          dismissal_type: Database["public"]["Enums"]["dismissal_type"]
          fielder_id?: string | null
          id?: string
          innings_id: string
          over_ball_text: string
          player_id: string
          team_runs_at_fall: number
          wicket_number: number
        }
        Update: {
          bowler_credited?: boolean
          bowler_id?: string | null
          created_at?: string
          delivery_id?: string | null
          dismissal_type?: Database["public"]["Enums"]["dismissal_type"]
          fielder_id?: string | null
          id?: string
          innings_id?: string
          over_ball_text?: string
          player_id?: string
          team_runs_at_fall?: number
          wicket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "wickets_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wickets_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wickets_fielder_id_fkey"
            columns: ["fielder_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wickets_innings_id_fkey"
            columns: ["innings_id"]
            isOneToOne: false
            referencedRelation: "innings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wickets_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      balls_to_overs_text: { Args: { p_balls: number }; Returns: string }
      calc_economy: {
        Args: { p_balls: number; p_runs: number }
        Returns: number
      }
      calc_strike_rate: {
        Args: { p_balls: number; p_runs: number }
        Returns: number
      }
      current_team_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      rpc_admin_dashboard: { Args: never; Returns: Json }
      rpc_admin_get_all_teams: { Args: never; Returns: Json }
      rpc_advance_day: { Args: { p_match_id: string }; Returns: Json }
      rpc_advance_session: { Args: { p_match_id: string }; Returns: Json }
      rpc_change_bowler: {
        Args: { p_bowler_id: string; p_match_id: string }
        Returns: Json
      }
      rpc_conduct_toss: {
        Args: {
          p_match_id: string
          p_toss_decision: Database["public"]["Enums"]["toss_decision"]
          p_toss_winner_id: string
        }
        Returns: Json
      }
      rpc_create_gully_singles_match: {
        Args: {
          p_bowler_order_rule: Database["public"]["Enums"]["bowler_order_rule"]
          p_bowling_allocation_rule: Database["public"]["Enums"]["bowling_allocation_rule"]
          p_bowling_allocations: Json
          p_draft_shuffled: boolean
          p_match_date: string
          p_opening_bowler_id?: string
          p_singles_batting_order: string[]
          p_singles_dismissal_rule: Database["public"]["Enums"]["singles_dismissal_rule"]
          p_total_overs: number
          p_venue: string
        }
        Returns: Json
      }
      rpc_create_gully_team_match: {
        Args: {
          p_bowler_id?: string
          p_bowling_allocation_rule: Database["public"]["Enums"]["bowling_allocation_rule"]
          p_match_date: string
          p_non_striker_id?: string
          p_striker_id?: string
          p_team_a_allocations: Json
          p_team_a_captain_id: string
          p_team_a_name: string
          p_team_a_player_ids: string[]
          p_team_b_allocations: Json
          p_team_b_captain_id: string
          p_team_b_name: string
          p_team_b_player_ids: string[]
          p_toss_decision?: Database["public"]["Enums"]["toss_decision"]
          p_toss_winner_team?: string
          p_total_overs: number
          p_venue: string
        }
        Returns: Json
      }
      rpc_declare_innings: { Args: { p_match_id: string }; Returns: Json }
      rpc_gully_change_bowler: {
        Args: { p_bowler_id: string; p_match_id: string }
        Returns: Json
      }
      rpc_gully_conduct_toss: {
        Args: {
          p_match_id: string
          p_toss_decision: Database["public"]["Enums"]["toss_decision"]
          p_toss_winner_team_id: string
        }
        Returns: Json
      }
      rpc_gully_draft: { Args: { p_player_ids: string[] }; Returns: Json }
      rpc_gully_end_match: { Args: { p_match_id: string }; Returns: Json }
      rpc_gully_score_delivery: {
        Args: { p_dto: Json; p_match_id: string }
        Returns: Json
      }
      rpc_gully_select_opening_players: {
        Args: {
          p_bowler_id: string
          p_innings_number?: number
          p_match_id: string
          p_non_striker_id: string
          p_striker_id: string
        }
        Returns: Json
      }
      rpc_gully_start_next_singles_batter: {
        Args: { p_match_id: string; p_opening_bowler_id?: string }
        Returns: Json
      }
      rpc_gully_start_next_singles_round: {
        Args: { p_match_id: string }
        Returns: Json
      }
      rpc_gully_undo_last_delivery: {
        Args: { p_match_id: string }
        Returns: Json
      }
      rpc_handle_follow_on: {
        Args: { p_enforce: boolean; p_match_id: string }
        Returns: Json
      }
      rpc_lookup_email_by_username: {
        Args: { p_username: string }
        Returns: string
      }
      rpc_score_delivery: {
        Args: { p_dto: Json; p_match_id: string }
        Returns: Json
      }
      rpc_select_opening_players: {
        Args: {
          p_bowler_id: string
          p_innings_number?: number
          p_match_id: string
          p_non_striker_id: string
          p_striker_id: string
        }
        Returns: Json
      }
      rpc_setup_playing_xi: {
        Args: {
          p_match_id: string
          p_team_a_playing_xi: string[]
          p_team_b_playing_xi: string[]
        }
        Returns: Json
      }
      rpc_undo_last_delivery: { Args: { p_match_id: string }; Returns: Json }
    }
    Enums: {
      bowler_order_rule: "FREE_SELECTION" | "PREDEFINED_ORDER"
      bowling_allocation_rule: "EXACT" | "MAX_LIMIT"
      dismissal_type:
        | "BOWLED"
        | "CAUGHT"
        | "LBW"
        | "RUN_OUT"
        | "STUMPED"
        | "HIT_WICKET"
        | "RETIRED_OUT"
        | "OBSTRUCTING_FIELD"
      extra_type: "NONE" | "WIDE" | "NO_BALL" | "BYE" | "LEG_BYE" | "PENALTY"
      gully_match_type: "TEAM_MATCH" | "SINGLES_MATCH"
      innings_status: "IN_PROGRESS" | "COMPLETED" | "DECLARED"
      match_format: "T10" | "T20" | "ODI" | "TEST"
      match_result_type:
        | "WIN_RUNS"
        | "WIN_WICKETS"
        | "WIN_INNINGS_RUNS"
        | "TIE"
        | "DRAW"
        | "NO_RESULT"
      match_status: "UPCOMING" | "LIVE" | "COMPLETED" | "ABANDONED"
      player_role: "BATTER" | "BOWLER" | "ALL_ROUNDER" | "WICKETKEEPER"
      singles_dismissal_rule: "LAST_WICKET_ENDS_INNINGS" | "BATTER_CONTINUES"
      toss_decision: "BAT" | "BOWL"
      user_role: "ADMIN" | "TEAM"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bowler_order_rule: ["FREE_SELECTION", "PREDEFINED_ORDER"],
      bowling_allocation_rule: ["EXACT", "MAX_LIMIT"],
      dismissal_type: [
        "BOWLED",
        "CAUGHT",
        "LBW",
        "RUN_OUT",
        "STUMPED",
        "HIT_WICKET",
        "RETIRED_OUT",
        "OBSTRUCTING_FIELD",
      ],
      extra_type: ["NONE", "WIDE", "NO_BALL", "BYE", "LEG_BYE", "PENALTY"],
      gully_match_type: ["TEAM_MATCH", "SINGLES_MATCH"],
      innings_status: ["IN_PROGRESS", "COMPLETED", "DECLARED"],
      match_format: ["T10", "T20", "ODI", "TEST"],
      match_result_type: [
        "WIN_RUNS",
        "WIN_WICKETS",
        "WIN_INNINGS_RUNS",
        "TIE",
        "DRAW",
        "NO_RESULT",
      ],
      match_status: ["UPCOMING", "LIVE", "COMPLETED", "ABANDONED"],
      player_role: ["BATTER", "BOWLER", "ALL_ROUNDER", "WICKETKEEPER"],
      singles_dismissal_rule: ["LAST_WICKET_ENDS_INNINGS", "BATTER_CONTINUES"],
      toss_decision: ["BAT", "BOWL"],
      user_role: ["ADMIN", "TEAM"],
    },
  },
} as const
