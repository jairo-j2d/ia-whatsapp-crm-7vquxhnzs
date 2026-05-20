import { useEffect, useState, useMemo } from 'react'
import { leadsService, Lead } from '@/services/leads'
import { memoryService, Memory } from '@/services/memory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Filter, Phone, Clock, User, MessageSquare, Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Database } from '@/lib/supabase/types'

type LeadStatus = Database['public']['Enums']['lead_status']

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [memories, setMemories] = useState<Memory[]>([])
  const [loadingMemories, setLoadingMemories] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    let isMounted = true

    fetchLeads()

    const channel = leadsService.subscribeToLeads(() => {
      if (isMounted) {
        fetchLeads()
      }
    })

    return () => {
      isMounted = false
      if (channel) {
        leadsService.unsubscribeLeads(channel)
      }
    }
  }, [])

  const fetchLeads = async () => {
    try {
      const data = await leadsService.getLeads()
      setLeads(data)
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar leads', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const fetchMemory = async (phone: string | null) => {
    if (!phone) {
      setMemories([])
      return
    }
    setLoadingMemories(true)
    try {
      // Assuming session_id maps to phone number in the schema
      const data = await memoryService.getMemoryBySession(phone)
      setMemories(data)
    } catch (error) {
      toast({ title: 'Erro', description: 'Falha ao carregar histórico', variant: 'destructive' })
    } finally {
      setLoadingMemories(false)
    }
  }

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead)
    fetchMemory(lead.phone)
  }

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!selectedLead) return
    try {
      const updated = await leadsService.updateLeadStatus(selectedLead.id, newStatus)
      setSelectedLead(updated)
      setLeads(leads.map((l) => (l.id === updated.id ? updated : l)))
      toast({ title: 'Status Atualizado', description: `Lead movido para ${newStatus}` })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status',
        variant: 'destructive',
      })
    }
  }

  const filteredLeads = useMemo(() => {
    if (!search) return leads
    const lowerSearch = search.toLowerCase()
    return leads.filter(
      (l) =>
        l.nome?.toLowerCase().includes(lowerSearch) || l.phone?.toLowerCase().includes(lowerSearch),
    )
  }, [leads, search])

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'em_atendimento':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30">Em Atendimento</Badge>
        )
      case 'Transferido':
        return (
          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 animate-pulse">
            Transferido
          </Badge>
        )
      case 'finalizado':
        return <Badge className="bg-cyan-500/20 text-cyan-500 border-cyan-500/30">Finalizado</Badge>
      case 'ativo':
        return <Badge className="bg-secondary/20 text-secondary border-secondary/30">Ativo</Badge>
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
            Inativo
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 h-full flex flex-col animate-slide-up">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white tracking-tight">Leads & CRM</h2>
      </div>

      <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">
        <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between space-y-0">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-black/50 border-border text-white focus-visible:ring-primary"
            />
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground text-sm">
            <Filter className="w-4 h-4" />
            <span>Filtros ativos: Nenhum</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border sticky top-0 bg-card z-10">
              <tr>
                <th className="px-6 py-4 font-medium">Contato</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Última Atualização</th>
                <th className="px-6 py-4 font-medium text-right">Data de Criação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-10">
                    <div className="flex justify-center">
                      <Search className="animate-spin text-primary opacity-50" />
                    </div>
                  </td>
                </tr>
              ) : filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => handleRowClick(lead)}
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-white group-hover:text-primary transition-colors">
                          {lead.nome}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center mt-1">
                          <Phone className="w-3 h-3 mr-1" /> {lead.phone || 'Sem número'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {lead.status_updated_at
                        ? format(new Date(lead.status_updated_at), 'dd MMM, HH:mm', {
                            locale: ptBR,
                          })
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-right">
                      {lead.created_at
                        ? format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                    Nenhum lead encontrado com estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Sheet open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg bg-card border-l-border p-0 flex flex-col text-white">
          {selectedLead && (
            <>
              <div className="p-6 border-b border-border bg-black/20">
                <SheetHeader className="text-left space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <SheetTitle className="text-2xl font-bold text-white flex items-center">
                        <User className="w-5 h-5 mr-2 text-primary" /> {selectedLead.nome}
                      </SheetTitle>
                      <SheetDescription className="text-muted-foreground flex items-center mt-1">
                        <Phone className="w-4 h-4 mr-2" /> {selectedLead.phone}
                      </SheetDescription>
                    </div>
                    {getStatusBadge(selectedLead.status)}
                  </div>
                </SheetHeader>

                <div className="mt-6">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Gerenciar Status
                  </label>
                  <Select
                    value={selectedLead.status || 'ativo'}
                    onValueChange={(val) => handleStatusChange(val as LeadStatus)}
                  >
                    <SelectTrigger className="w-full bg-black border-border focus:ring-primary">
                      <SelectValue placeholder="Selecione um status" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-white">
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                      <SelectItem value="Transferido">Transferido (Humano)</SelectItem>
                      <SelectItem value="finalizado">Finalizado</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col p-6">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center mb-4 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 mr-2" /> Histórico de Interação
                </h3>

                <ScrollArea className="flex-1 pr-4 -mr-4">
                  {loadingMemories ? (
                    <div className="flex justify-center py-10">
                      <Activity className="animate-spin text-primary" />
                    </div>
                  ) : memories.length > 0 ? (
                    <div className="space-y-4 pb-4">
                      {memories.map((mem) => {
                        const msg = mem.message as any
                        const isAi = msg?.type === 'ai'
                        return (
                          <div
                            key={mem.id}
                            className={cn(
                              'flex flex-col max-w-[85%]',
                              isAi ? 'ml-auto items-end' : 'mr-auto items-start',
                            )}
                          >
                            <div
                              className={cn(
                                'px-4 py-2 rounded-2xl text-sm',
                                isAi
                                  ? 'bg-primary text-white rounded-tr-sm'
                                  : 'bg-white/10 text-gray-200 rounded-tl-sm border border-white/5',
                              )}
                            >
                              {msg?.text || JSON.stringify(msg)}
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 opacity-70">
                              {isAi ? 'Agente IA' : 'Lead'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 border border-dashed border-border rounded-lg bg-black/20">
                      <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground mb-3 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma mensagem registrada nesta sessão.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
