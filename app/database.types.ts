export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      article: {
        Row: {
          agent: string | null;
          archived: boolean;
          author: string | null;
          created_at: string;
          history: Json | null;
          id: number;
          link: string;
          media: string | null;
          publication: string;
          published_at: string;
          read: boolean;
          reason: string | null;
          saved: boolean;
          score: number;
          ai_score2: number;
          tags_mood: string[] | null;
          tags_scope: string[] | null;
          tags_topic: string[] | null;
          summary: string | null;
          tags: string[] | null;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          agent?: string | null;
          archived?: boolean;
          author?: string | null;
          created_at?: string;
          history?: Json | null;
          id?: number;
          link: string;
          media?: string | null;
          publication: string;
          published_at: string;
          read?: boolean;
          reason?: string | null;
          saved?: boolean;
          score?: number;
          ai_score2?: number;
          tags_mood?: string[] | null;
          tags_scope?: string[] | null;
          tags_topic?: string[] | null;
          summary?: string | null;
          tags?: string[] | null;
          title: string;
          updated_at?: string;
          user_id?: string;
        };
        Update: {
          agent?: string | null;
          archived?: boolean;
          author?: string | null;
          created_at?: string;
          history?: Json | null;
          id?: number;
          link?: string;
          media?: string | null;
          publication?: string;
          published_at?: string;
          read?: boolean;
          reason?: string | null;
          saved?: boolean;
          score?: number;
          ai_score2?: number;
          tags_mood?: string[] | null;
          tags_scope?: string[] | null;
          tags_topic?: string[] | null;
          summary?: string | null;
          tags?: Json | null;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "article_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      feed: {
        Row: {
          enabled: boolean;
          id: number;
          title: string | null;
          url: string;
        };
        Insert: {
          enabled?: boolean;
          id?: number;
          title?: string | null;
          url: string;
        };
        Update: {
          enabled?: boolean;
          id?: number;
          title?: string | null;
          url?: string;
        };
        Relationships: [];
      };
      tag: {
        Row: {
          created_at: string;
          name: string;
          score: number;
        };
        Insert: {
          created_at?: string;
          name?: string;
          score?: number;
        };
        Update: {
          created_at?: string;
          name?: string;
          score?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      recent_publications: {
        Row: {
          publication: string;
        };
      };
    };
    Functions: {
      update_articles_with_agent_results: {
        Args: {
          data: Json;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Feed = Database["public"]["Tables"]["feed"]["Row"];
export type Article = Database["public"]["Tables"]["article"]["Row"];
export type Tag = Database["public"]["Tables"]["tag"]["Row"];
