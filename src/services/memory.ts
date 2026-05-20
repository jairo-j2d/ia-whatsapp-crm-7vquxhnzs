import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Memory = Database['public']['Tables']['memória']['Row']
export type ChatHistory = Database['public']['Tables']['n8n_chat_histories']['Row']

export const memoryService = {
  async getMemoryBySession(sessionId: string) {
    const { data, error } = await supabase
      .from('memória')
      .select('*')
      .eq('session_id', sessionId)
      .order('id', { ascending: true })

    if (error) throw error
    return data as Memory[]
  },

  async getChatLogsBySession(sessionId: string) {
    const { data, error } = await supabase
      .from('n8n_chat_histories')
      .select('*')
      .eq('session_id', sessionId)
      .order('id', { ascending: true })

    if (error) throw error
    return data as ChatHistory[]
  },

  async getAllMemories() {
    const { data, error } = await supabase.from('memória').select('session_id, id')

    if (error) throw error
    return data
  },
}
