import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Document = Database['public']['Tables']['documents']['Row']

export const documentsService = {
  async getDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('id, content, metadata')
      .order('id', { ascending: false })

    if (error) throw error
    return data as Document[]
  },
}
