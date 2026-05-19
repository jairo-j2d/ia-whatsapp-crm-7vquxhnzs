import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/types'

export type Lead = Database['public']['Tables']['LeadsWA']['Row']

export const leadsService = {
  async getLeads() {
    const { data, error } = await supabase
      .from('LeadsWA')
      .select('*')
      .order('status_updated_at', { ascending: false, nullsFirst: false })
    if (error) throw error
    return data as Lead[]
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
    return supabase
      .channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'LeadsWA' }, callback)
      .subscribe()
  },
}
