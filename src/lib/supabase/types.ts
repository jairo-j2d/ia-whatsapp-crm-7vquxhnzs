// AVOID UPDATING THIS FILE DIRECTLY. It is automatically generated.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      familiares: {
        Row: {
          created_at: string
          id: string
          nome: string | null
          whatsapp_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome?: string | null
          whatsapp_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string | null
          whatsapp_id?: string
        }
        Relationships: []
      }
      LeadsWA: {
        Row: {
          created_at: string | null
          id: string
          lead_source: string | null
          lead_type: string | null
          nome: string
          phone: string | null
          responsible_name: string | null
          status: string | null
          status_updated_at: string | null
          transfer_expires_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_source?: string | null
          lead_type?: string | null
          nome: string
          phone?: string | null
          responsible_name?: string | null
          status?: string | null
          status_updated_at?: string | null
          transfer_expires_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_source?: string | null
          lead_type?: string | null
          nome?: string
          phone?: string | null
          responsible_name?: string | null
          status?: string | null
          status_updated_at?: string | null
          transfer_expires_at?: string | null
        }
        Relationships: []
      }
      memória: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
    }
    Enums: {
      lead_status: 'ativo' | 'em_atendimento' | 'Transferido' | 'finalizado' | 'inativo'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      lead_status: ['ativo', 'em_atendimento', 'Transferido', 'finalizado', 'inativo'],
    },
  },
} as const

// ====== DATABASE EXTENDED CONTEXT (auto-generated) ======
// This section contains actual PostgreSQL column types, constraints, RLS policies,
// functions, triggers, indexes and materialized views not present in the type definitions above.
// IMPORTANT: The TypeScript types above map UUID, TEXT, VARCHAR all to "string".
// Use the COLUMN TYPES section below to know the real PostgreSQL type for each column.
// Always use the correct PostgreSQL type when writing SQL migrations.

// --- COLUMN TYPES (actual PostgreSQL types) ---
// Use this to know the real database type when writing migrations.
// "string" in TypeScript types above may be uuid, text, varchar, timestamptz, etc.
// Table: LeadsWA
//   id: uuid (not null, default: gen_random_uuid())
//   nome: text (not null)
//   phone: text (nullable)
//   status: text (nullable, default: 'ativo'::text)
//   created_at: timestamp with time zone (nullable, default: now())
//   status_updated_at: timestamp with time zone (nullable)
//   transfer_expires_at: timestamp with time zone (nullable)
//   lead_type: text (nullable)
//   responsible_name: text (nullable)
//   lead_source: text (nullable, default: 'Agente IA'::text)
// Table: documents
//   id: bigint (not null, default: nextval('documents_id_seq'::regclass))
//   content: text (nullable)
//   metadata: jsonb (nullable)
//   embedding: vector (nullable)
// Table: familiares
//   id: uuid (not null, default: gen_random_uuid())
//   whatsapp_id: text (not null)
//   nome: text (nullable)
//   created_at: timestamp with time zone (not null, default: now())
// Table: memória
//   id: integer (not null, default: nextval('"memória_id_seq"'::regclass))
//   session_id: character varying (not null)
//   message: jsonb (not null)
// Table: n8n_chat_histories
//   id: integer (not null, default: nextval('n8n_chat_histories_id_seq'::regclass))
//   session_id: character varying (not null)
//   message: jsonb (not null)

// --- CONSTRAINTS ---
// Table: LeadsWA
//   UNIQUE LeadsWA_phone_key: UNIQUE (phone)
//   PRIMARY KEY LeadsWA_pkey: PRIMARY KEY (id)
// Table: documents
//   PRIMARY KEY documents_pkey: PRIMARY KEY (id)
// Table: familiares
//   PRIMARY KEY familiares_pkey: PRIMARY KEY (id)
//   UNIQUE familiares_whatsapp_id_key: UNIQUE (whatsapp_id)
// Table: memória
//   PRIMARY KEY memória_pkey: PRIMARY KEY (id)
// Table: n8n_chat_histories
//   PRIMARY KEY n8n_chat_histories_pkey: PRIMARY KEY (id)

// --- ROW LEVEL SECURITY POLICIES ---
// Table: LeadsWA
//   Policy "leadswa_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "permite" (ALL, PERMISSIVE) roles={public}
//     USING: true
// Table: documents
//   Policy "documents_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
//   Policy "n8n" (ALL, PERMISSIVE) roles={public}
//     USING: true
// Table: familiares
//   Policy "familiares_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: memória
//   Policy "memoria_all" (ALL, PERMISSIVE) roles={authenticated}
//     USING: true
//     WITH CHECK: true
// Table: n8n_chat_histories
//   Policy "n8n" (ALL, PERMISSIVE) roles={public}
//     USING: true

// --- DATABASE FUNCTIONS ---
// FUNCTION match_documents(vector, integer, jsonb)
//   CREATE OR REPLACE FUNCTION public.match_documents(query_embedding vector, match_count integer DEFAULT NULL::integer, filter jsonb DEFAULT '{}'::jsonb)
//    RETURNS TABLE(id bigint, content text, metadata jsonb, similarity double precision)
//    LANGUAGE plpgsql
//   AS $function$
//   #variable_conflict use_column
//   begin
//     return query
//     select
//       id,
//       content,
//       metadata,
//       1 - (documents.embedding <=> query_embedding) as similarity
//     from documents
//     where metadata @> filter
//     order by documents.embedding <=> query_embedding
//     limit match_count;
//   end;
//   $function$
//

// --- INDEXES ---
// Table: LeadsWA
//   CREATE UNIQUE INDEX "LeadsWA_phone_key" ON public."LeadsWA" USING btree (phone)
//   CREATE INDEX idx_leads_phone ON public."LeadsWA" USING btree (phone)
//   CREATE INDEX idx_leads_status ON public."LeadsWA" USING btree (status)
//   CREATE INDEX idx_leads_transfer_expires_at ON public."LeadsWA" USING btree (transfer_expires_at)
// Table: familiares
//   CREATE UNIQUE INDEX familiares_whatsapp_id_key ON public.familiares USING btree (whatsapp_id)
