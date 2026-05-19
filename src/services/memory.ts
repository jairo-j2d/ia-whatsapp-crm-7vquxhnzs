import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Memory = Database['public']['Tables']['memória']['Row']

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

  async getAllMemories() {
    const { data, error } = await supabase.from('memória').select('session_id, id')

    if (error) throw error
    return data
  },
}
