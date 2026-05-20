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

  subscribeToDocuments(callback: (payload: any) => void) {
    const channelId = `documents-changes-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, callback)
      .subscribe()

    return channel
  },

  unsubscribeDocuments(channel: any) {
    if (channel) {
      supabase.removeChannel(channel)
    }
  },
}
