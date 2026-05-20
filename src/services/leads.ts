import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type LeadRow = Database['public']['Tables']['LeadsWA']['Row']

export type Lead = LeadRow & {
  lead_type?: string | null
  responsible_name?: string | null
  lead_source?: string | null
  sale_value?: number | null
  lost_reason?: string | null
  lead_quality_feedback?: string | null
}

export const leadsService = {
  async getLeads() {
    const { data, error } = await supabase
      .from('LeadsWA')
      .select('*')
      .order('status_updated_at', { ascending: false, nullsFirst: false })
    if (error) throw error
    return data as Lead[]
  },

  async getChatHistories() {
    const { data, error } = await supabase.from('n8n_chat_histories').select('*')
    if (error) throw error
    return data as any[]
  },

  async updateLeadStatus(id: string, status: Database['public']['Enums']['lead_status']) {
    const { data, error } = await supabase
      .from('LeadsWA')
      .update({ status, status_updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Lead
  },

  subscribeToLeads(callback: (payload: any) => void) {
    const activeChannels = supabase.getChannels()
    activeChannels.forEach((ch) => {
      if (ch.topic && ch.topic.includes('leads-changes-')) {
        supabase.removeChannel(ch).catch(console.error)
      }
    })

    const channelId = `leads-changes-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    const channel = supabase.channel(channelId)

    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'LeadsWA' }, callback)

    channel.subscribe((status, err) => {
      if (err) {
        console.error('Supabase Realtime subscription error:', err)
      }
    })

    return channel
  },

  async unsubscribeLeads(channel: any) {
    if (channel) {
      try {
        await supabase.removeChannel(channel)
      } catch (error) {
        console.error('Error removing channel:', error)
      }
    }
  },
}
