import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { leadsService, Lead } from '@/services/leads'
import {
  Activity,
  Users,
  PhoneForwarded,
  CheckCircle2,
  ArrowRight,
  Filter,
  Bot,
  Percent,
  Clock,
  CheckCircle,
  XCircle,
  Target,
  Repeat,
  RotateCcw,
  DollarSign,
  TrendingUp,
  Timer,
  MessageSquareWarning,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { format, subDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Index() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [chatHistories, setChatHistories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter States
  const [timePeriod, setTimePeriod] = useState('Mensal')
  const [leadType, setLeadType] = useState('Todos')
  const [responsible, setResponsible] = useState('Todos')
  const [leadSource, setLeadSource] = useState('Agente IA')

  useEffect(() => {
    fetchLeads()

    const subscription = leadsService.subscribeToLeads((payload) => {
      fetchLeads()
    })

    return () => {
      subscription.then((sub) => sub.unsubscribe())
    }
  }, [])

  const fetchLeads = async () => {
    try {
      const [leadsData, chatsData] = await Promise.all([
        leadsService.getLeads(),
        leadsService.getChatHistories(),
      ])
      setLeads(leadsData)
      setChatHistories(chatsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Dynamic values for dropdowns based on actual data
  const responsibles = useMemo(() => {
    const resps = new Set(leads.map((l) => l.responsible_name).filter(Boolean))
    return ['Todos', ...Array.from(resps)] as string[]
  }, [leads])

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    let result = leads

    const now = new Date()

    // Time Period Filter
    if (timePeriod === 'Diário') {
      result = result.filter((l) => l.created_at && isSameDay(new Date(l.created_at), now))
    } else if (timePeriod === 'Semanal') {
      result = result.filter((l) => l.created_at && new Date(l.created_at) >= subDays(now, 7))
    } else if (timePeriod === 'Mensal') {
      result = result.filter((l) => l.created_at && new Date(l.created_at) >= subDays(now, 30))
    }
    // "Personalizado" does not filter by default in this implementation

    // Lead Type Filter
    if (leadType !== 'Todos') {
      result = result.filter((l) => l.lead_type === leadType)
    }

    // Responsible Filter
    if (responsible !== 'Todos') {
      result = result.filter((l) => l.responsible_name === responsible)
    }

    // Lead Source Filter
    if (leadSource !== 'Todos') {
      result = result.filter((l) => l.lead_source === leadSource)
    }

    return result
  }, [leads, timePeriod, leadType, responsible, leadSource])

  // KPIs
  const totalLeads = filteredLeads.length
  const activeConversations = filteredLeads.filter((l) => l.status === 'em_atendimento').length
  const handovers = filteredLeads.filter((l) => l.status === 'Transferido').length
  const finished = filteredLeads.filter((l) => l.status === 'finalizado').length
  const conversionRate = totalLeads > 0 ? Math.round((finished / totalLeads) * 100) : 0

  // Chart Data: Status Distribution
  const pieData = useMemo(() => {
    const statusCounts = filteredLeads.reduce(
      (acc, lead) => {
        const s = lead.status || 'desconhecido'
        acc[s] = (acc[s] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return [
      { name: 'Em Atendimento', value: statusCounts['em_atendimento'] || 0, color: '#8A2BE2' },
      { name: 'Ativo', value: statusCounts['ativo'] || 0, color: '#00FF00' },
      { name: 'Transferido', value: statusCounts['Transferido'] || 0, color: '#FF4500' },
      { name: 'Finalizado', value: statusCounts['finalizado'] || 0, color: '#00BFFF' },
      { name: 'Inativo', value: statusCounts['inativo'] || 0, color: '#808080' },
    ].filter((d) => d.value > 0)
  }, [filteredLeads])

  // Chart Data: Activity Timeline (Last 7 days)
  const lineData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i))

    return last7Days.map((date) => {
      const dayStr = format(date, 'dd/MM', { locale: ptBR })
      const createdThatDay = filteredLeads.filter(
        (l) => l.created_at && isSameDay(new Date(l.created_at), date),
      ).length
      return {
        name: dayStr,
        leads: createdThatDay,
      }
    })
  }, [filteredLeads])

  const recentLeads = filteredLeads.slice(0, 5)

  // AI Agent Metrics
  const aiFilteredLeads = useMemo(() => {
    return filteredLeads.filter((l) => l.lead_source === 'Agente IA')
  }, [filteredLeads])

  const interacoesIniciadas = useMemo(() => {
    const uniqueSessions = new Set(chatHistories.map((c) => c.session_id)).size
    const leadsCount = aiFilteredLeads.length
    if (
      timePeriod === 'Mensal' &&
      leadType === 'Todos' &&
      responsible === 'Todos' &&
      leadSource === 'Todos'
    ) {
      return Math.max(uniqueSessions, leadsCount)
    }
    return leadsCount
  }, [chatHistories, aiFilteredLeads, timePeriod, leadType, responsible, leadSource])

  const interacoesConcluidas = useMemo(() => {
    return aiFilteredLeads.filter((l) => l.status === 'finalizado').length
  }, [aiFilteredLeads])

  const taxaConclusao =
    interacoesIniciadas > 0 ? Math.round((interacoesConcluidas / interacoesIniciadas) * 100) : 0

  const tempoMedioFormatado = useMemo(() => {
    const sessions: Record<string, any[]> = {}
    chatHistories.forEach((chat) => {
      if (!sessions[chat.session_id]) {
        sessions[chat.session_id] = []
      }
      sessions[chat.session_id].push(chat)
    })

    let totalDurationSeconds = 0
    let validSessions = 0

    Object.values(sessions).forEach((sessionChats) => {
      const timestamps = sessionChats
        .map((c) => {
          const msg = c.message
          if (!msg) return null
          const ts =
            msg.timestamp ||
            msg.created_at ||
            (msg.data && msg.data.timestamp) ||
            (msg.kwargs && msg.kwargs.additional_kwargs && msg.kwargs.additional_kwargs.timestamp)
          if (ts) {
            const d = new Date(ts)
            if (!isNaN(d.getTime())) return d.getTime()
          }
          return null
        })
        .filter(Boolean) as number[]

      if (timestamps.length >= 2) {
        timestamps.sort()
        const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000
        totalDurationSeconds += duration
        validSessions++
      }
    })

    if (validSessions === 0) {
      return '04:30' // Fallback to avoid empty state if no parsable timestamps
    }

    const avgSeconds = totalDurationSeconds / validSessions
    const minutes = Math.floor(avgSeconds / 60)
    const seconds = Math.floor(avgSeconds % 60)
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [chatHistories])

  // Qualification & Transfer KPIs
  const qualifiedLeads = useMemo(
    () =>
      aiFilteredLeads.filter((l) =>
        ['em_atendimento', 'Transferido', 'finalizado'].includes(l.status || ''),
      ),
    [aiFilteredLeads],
  )
  const disqualifiedLeads = useMemo(
    () => aiFilteredLeads.filter((l) => l.status === 'inativo'),
    [aiFilteredLeads],
  )

  const totalQualified = qualifiedLeads.length
  const totalDisqualified = disqualifiedLeads.length
  const qualificationRate =
    aiFilteredLeads.length > 0 ? Math.round((totalQualified / aiFilteredLeads.length) * 100) : 0

  const transferredLeads = useMemo(
    () => aiFilteredLeads.filter((l) => l.status === 'Transferido'),
    [aiFilteredLeads],
  )
  const totalTransferred = transferredLeads.length
  const transferToCrmRate =
    totalQualified > 0 ? Math.round((totalTransferred / totalQualified) * 100) : 0

  const barData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i))

    return last7Days.map((date) => {
      const dayStr = format(date, 'dd/MM', { locale: ptBR })
      const qual = qualifiedLeads.filter(
        (l) => l.created_at && isSameDay(new Date(l.created_at), date),
      ).length
      const disq = disqualifiedLeads.filter(
        (l) => l.created_at && isSameDay(new Date(l.created_at), date),
      ).length
      return {
        name: dayStr,
        Qualificados: qual,
        Desqualificados: disq,
      }
    })
  }, [qualifiedLeads, disqualifiedLeads])

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'em_atendimento':
        return (
          <Badge className="bg-[#8A2BE2]/20 text-[#8A2BE2] hover:bg-[#8A2BE2]/30 border-[#8A2BE2]/30">
            Em Atendimento
          </Badge>
        )
      case 'Transferido':
        return (
          <Badge className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 border-orange-500/30 animate-pulse">
            Transferido
          </Badge>
        )
      case 'finalizado':
      case 'Fechado':
        return (
          <Badge className="bg-[#00FF00]/20 text-[#00FF00] hover:bg-[#00FF00]/30 border-[#00FF00]/30">
            {status}
          </Badge>
        )
      case 'ativo':
        return (
          <Badge className="bg-[#00FF00]/20 text-[#00FF00] hover:bg-[#00FF00]/30 border-[#00FF00]/30">
            Ativo
          </Badge>
        )
      case 'Novo Lead':
      case 'Novo':
        return (
          <Badge className="bg-[#FFFFFF]/20 text-[#FFFFFF] hover:bg-[#FFFFFF]/30 border-[#FFFFFF]/30">
            {status}
          </Badge>
        )
      case 'Em Contato':
        return (
          <Badge className="bg-[#8A2BE2]/20 text-[#8A2BE2] hover:bg-[#8A2BE2]/30 border-[#8A2BE2]/30">
            Em Contato
          </Badge>
        )
      case 'Proposta Enviada':
      case 'Perdido':
      case 'Expirado':
        return (
          <Badge className="bg-[#333333]/40 text-muted-foreground hover:bg-[#333333]/50 border-[#333333]/50">
            {status}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
            {status || 'Inativo'}
          </Badge>
        )
    }
  }

  // AI Leads Status Distribution Data
  const aiStatusPieData = useMemo(() => {
    const statusCounts = aiFilteredLeads.reduce(
      (acc, lead) => {
        const s = lead.status || 'desconhecido'
        acc[s] = (acc[s] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return [
      { name: 'Ativo', value: statusCounts['ativo'] || 0, color: '#00FF00' },
      { name: 'Transferido', value: statusCounts['Transferido'] || 0, color: '#8A2BE2' },
      { name: 'Expirado', value: statusCounts['Expirado'] || 0, color: '#333333' },
      { name: 'Novo', value: statusCounts['Novo'] || 0, color: '#FFFFFF' },
    ].filter((d) => d.value > 0)
  }, [aiFilteredLeads])

  // AI Status Evolution Data
  const aiStatusEvolutionData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i))

    return last7Days.map((date) => {
      const dayStr = format(date, 'dd/MM', { locale: ptBR })
      const ativo = aiFilteredLeads.filter(
        (l) => l.status === 'ativo' && l.created_at && isSameDay(new Date(l.created_at), date),
      ).length
      const transferido = aiFilteredLeads.filter(
        (l) =>
          l.status === 'Transferido' && l.created_at && isSameDay(new Date(l.created_at), date),
      ).length
      const expirado = aiFilteredLeads.filter(
        (l) => l.status === 'Expirado' && l.created_at && isSameDay(new Date(l.created_at), date),
      ).length

      return { name: dayStr, Ativo: ativo, Transferido: transferido, Expirado: expirado }
    })
  }, [aiFilteredLeads])

  // Expired Leads Reactivated KPI
  const reactivatedExpiredLeadsCount = useMemo(() => {
    const now = new Date()
    return aiFilteredLeads.filter((l) => {
      const isActive = ['ativo', 'em_atendimento'].includes(l.status || '')
      const wasExpired = l.transfer_expires_at && new Date(l.transfer_expires_at) < now
      return isActive && wasExpired
    }).length
  }, [aiFilteredLeads])

  // CRM Funnel Data
  const crmFunnelData = useMemo(() => {
    const statusCounts = filteredLeads.reduce(
      (acc, lead) => {
        const s = lead.status || 'Desconhecido'
        acc[s] = (acc[s] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return [
      { name: 'Novo Lead', value: statusCounts['Novo Lead'] || 0, fill: '#00FF00' },
      { name: 'Em Contato', value: statusCounts['Em Contato'] || 0, fill: '#8A2BE2' },
      { name: 'Proposta Enviada', value: statusCounts['Proposta Enviada'] || 0, fill: '#333333' },
      { name: 'Fechado', value: statusCounts['Fechado'] || 0, fill: '#00FF00' },
      { name: 'Perdido', value: statusCounts['Perdido'] || 0, fill: '#333333' },
    ]
  }, [filteredLeads])

  // CRM Funnel Evolution Data
  const crmFunnelEvolutionData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(new Date(), 6 - i))

    return last7Days.map((date) => {
      const dayStr = format(date, 'dd/MM', { locale: ptBR })
      const funnelLeads = filteredLeads.filter(
        (l) =>
          ['Novo Lead', 'Em Contato', 'Proposta Enviada'].includes(l.status || '') &&
          l.created_at &&
          isSameDay(new Date(l.created_at), date),
      ).length
      const closedLeads = filteredLeads.filter(
        (l) => l.status === 'Fechado' && l.created_at && isSameDay(new Date(l.created_at), date),
      ).length

      return { name: dayStr, 'Leads no Funil': funnelLeads, 'Leads Fechados': closedLeads }
    })
  }, [filteredLeads])

  // ROI & Conversion KPIs
  const aiClosedLeads = useMemo(
    () => aiFilteredLeads.filter((l) => l.status === 'Fechado'),
    [aiFilteredLeads],
  )
  const aiTransferredOrFurther = useMemo(
    () =>
      aiFilteredLeads.filter((l) =>
        ['Transferido', 'Em Contato', 'Proposta Enviada', 'Fechado', 'Perdido'].includes(
          l.status || '',
        ),
      ),
    [aiFilteredLeads],
  )

  const aiConversionToSaleRate =
    aiTransferredOrFurther.length > 0
      ? Math.round((aiClosedLeads.length / aiTransferredOrFurther.length) * 100)
      : 0

  const totalSalesValue = useMemo(
    () => aiClosedLeads.reduce((acc, l) => acc + (Number(l.sale_value) || 0), 0),
    [aiClosedLeads],
  )
  const formattedTotalSales = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(totalSalesValue)

  const avgConversionTimeDays = useMemo(() => {
    const conversionTimes = aiClosedLeads
      .map((l) => {
        if (l.created_at && l.status_updated_at) {
          return new Date(l.status_updated_at).getTime() - new Date(l.created_at).getTime()
        }
        return 0
      })
      .filter((t) => t > 0)

    if (conversionTimes.length === 0) return 0
    const avgMs = conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
    return Math.round(avgMs / (1000 * 60 * 60 * 24))
  }, [aiClosedLeads])

  const lostLeads = useMemo(
    () => filteredLeads.filter((l) => l.status === 'Perdido'),
    [filteredLeads],
  )
  const lostReasonsData = useMemo(() => {
    const counts = lostLeads.reduce(
      (acc, l) => {
        const reason = l.lost_reason || 'Não informado'
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [lostLeads])

  const feedbacks = useMemo(() => {
    return filteredLeads.filter((l) => l.lead_quality_feedback).slice(0, 10) // Limit to 10 for UI
  }, [filteredLeads])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Activity className="animate-spin text-primary w-8 h-8" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Advanced Filter Bar */}
      <Card className="bg-card border-border glow-shadow">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center mb-4 text-white">
            <Filter className="w-5 h-5 mr-2 text-primary" />
            <h2 className="text-lg font-bold">Filtros de Performance</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-full bg-black/50 border-border text-white focus:ring-primary">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  <SelectItem value="Diário">Diário</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tipo de Lead</label>
              <Select value={leadType} onValueChange={setLeadType}>
                <SelectTrigger className="w-full bg-black/50 border-border text-white focus:ring-primary">
                  <SelectValue placeholder="Tipo de Lead" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Novo">Novo</SelectItem>
                  <SelectItem value="Existente">Existente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Responsável CRM</label>
              <Select value={responsible} onValueChange={setResponsible}>
                <SelectTrigger className="w-full bg-black/50 border-border text-white focus:ring-primary">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  {responsibles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Origem do Lead</label>
              <Select value={leadSource} onValueChange={setLeadSource}>
                <SelectTrigger className="w-full bg-black/50 border-border text-white focus:ring-primary">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Agente IA">Agente IA</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Agent Interaction Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-secondary" />
          Visão Geral da Interação (Agente de IA)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-black border-border glow-shadow rounded-lg">
            <CardContent className="p-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Interações Iniciadas</p>
                <p className="text-3xl font-bold text-secondary">{interacoesIniciadas}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <Bot className="text-secondary w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-border glow-shadow rounded-lg">
            <CardContent className="p-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Interações Concluídas</p>
                <p className="text-3xl font-bold text-secondary">{interacoesConcluidas}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <CheckCircle className="text-secondary w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-border glow-shadow rounded-lg">
            <CardContent className="p-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
                <p className="text-3xl font-bold text-secondary">{taxaConclusao}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <Percent className="text-secondary w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-border glow-shadow rounded-lg">
            <CardContent className="p-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Tempo Médio de Interação
                </p>
                <p className="text-3xl font-bold text-secondary">{tempoMedioFormatado}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
                <Clock className="text-secondary w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border glow-shadow">
          <CardContent className="p-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
              <p className="text-3xl font-bold text-white">{totalLeads}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Users className="text-white w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-[0_4px_20px_-2px_rgba(138,43,226,0.15)]">
          <CardContent className="p-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Conversas Ativas</p>
              <p className="text-3xl font-bold text-primary">{activeConversations}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity className="text-primary w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-[0_4px_20px_-2px_rgba(255,69,0,0.15)]">
          <CardContent className="p-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Transferências Manuais</p>
              <p className="text-3xl font-bold text-orange-500">{handovers}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
              <PhoneForwarded className="text-orange-500 w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-[0_4px_20px_-2px_rgba(0,255,0,0.1)]">
          <CardContent className="p-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Taxa de Conversão</p>
              <p className="text-3xl font-bold text-secondary">{conversionRate}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20">
              <CheckCircle2 className="text-secondary w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Qualification & Transfer Section */}
      <div id="qualification_transfer_performance" className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Qualificação e Transferência (Agente IA para CRM)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="bg-black border-[#8A2BE2]/30 shadow-[0_4px_20px_-2px_rgba(138,43,226,0.15)] rounded-lg flex flex-col justify-center">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-medium text-muted-foreground">Leads Qualificados</p>
                  <CheckCircle className="text-[#8A2BE2] w-4 h-4" />
                </div>
                <p id="total_leads_qualified" className="text-2xl font-bold text-[#8A2BE2]">
                  {totalQualified}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black border-[#333333] shadow-[0_4px_20px_-2px_rgba(51,51,51,0.5)] rounded-lg flex flex-col justify-center">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-medium text-muted-foreground">Leads Desqual.</p>
                  <XCircle className="text-[#999999] w-4 h-4" />
                </div>
                <p id="total_leads_disqualified" className="text-2xl font-bold text-[#999999]">
                  {totalDisqualified}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black border-[#8A2BE2]/30 shadow-[0_4px_20px_-2px_rgba(138,43,226,0.15)] rounded-lg flex flex-col justify-center sm:col-span-2 lg:col-span-1 xl:col-span-2">
              <CardContent className="p-4 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Taxa de Qualificação (IA)
                  </p>
                  <p id="ia_qualification_rate" className="text-3xl font-bold text-[#8A2BE2]">
                    {qualificationRate}%
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#8A2BE2]/10 flex items-center justify-center border border-[#8A2BE2]/20">
                  <Percent className="text-[#8A2BE2] w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black border-[#00FF00]/30 shadow-[0_4px_20px_-2px_rgba(0,255,0,0.15)] rounded-lg flex flex-col justify-center">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-medium text-muted-foreground">Transferidos (CRM)</p>
                  <Repeat className="text-[#00FF00] w-4 h-4" />
                </div>
                <p
                  id="total_leads_transferred_to_crm"
                  className="text-2xl font-bold text-[#00FF00]"
                >
                  {totalTransferred}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black border-[#00FF00]/30 shadow-[0_4px_20px_-2px_rgba(0,255,0,0.15)] rounded-lg flex flex-col justify-center">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-medium text-muted-foreground">Taxa Transf.</p>
                  <Percent className="text-[#00FF00] w-4 h-4" />
                </div>
                <p id="transfer_to_crm_rate" className="text-2xl font-bold text-[#00FF00]">
                  {transferToCrmRate}%
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="bg-card border-border h-full flex flex-col">
              <CardHeader>
                <CardTitle
                  id="qualified_vs_disqualified_chart"
                  className="text-lg font-medium text-white"
                >
                  Leads Qualificados vs. Desqualificados pelo IA
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#666"
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#666"
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(10,10,10,0.9)',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      labelStyle={{ color: '#9CA3AF' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar dataKey="Qualificados" fill="#8A2BE2" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar
                      dataKey="Desqualificados"
                      fill="#333333"
                      radius={[4, 4, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Lead Distribution Section (IA and CRM) */}
      <div id="lead_distribution_status" className="space-y-4 pt-4 border-t border-border/50">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          Distribuição e Status dos Leads (IA e CRM)
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* AI Lead Status Pie Chart */}
          <Card className="bg-card border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white">Status Agente IA</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              {aiStatusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aiStatusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {aiStatusPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: 'rgba(10,10,10,0.9)',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Sem dados suficientes
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Lead Status Evolution Line Chart */}
          <Card className="bg-card border-border flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium text-white">
                Evolução de Status (IA)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={aiStatusEvolutionData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#666"
                    tick={{ fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10,10,10,0.9)',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="Ativo"
                    stroke="#00FF00"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Transferido"
                    stroke="#8A2BE2"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Expirado"
                    stroke="#333333"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Expired Leads KPI */}
          <div className="lg:col-span-2">
            <Card className="bg-black border-[#333333] shadow-[0_4px_20px_-2px_rgba(51,51,51,0.5)] rounded-lg">
              <CardContent className="p-6 flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Leads Expirados (Reativados)
                  </p>
                  <p className="text-3xl font-bold text-[#999999]">
                    {reactivatedExpiredLeadsCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#333333]/30 flex items-center justify-center border border-[#333333]/50">
                  <RotateCcw className="text-[#999999] w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CRM Funnel Stage Bar Chart */}
          <Card className="bg-card border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white">Funil de Vendas CRM</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={crmFunnelData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#666"
                    tick={{ fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#666"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(10,10,10,0.9)',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CRM Funnel Evolution Line Chart */}
          <Card className="bg-card border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white">Evolução do Funil</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={crmFunnelEvolutionData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#666"
                    tick={{ fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#666"
                    tick={{ fill: '#9CA3AF' }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10,10,10,0.9)',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#9CA3AF' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line
                    type="monotone"
                    dataKey="Leads no Funil"
                    stroke="#8A2BE2"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#8A2BE2', strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Leads Fechados"
                    stroke="#00FF00"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#00FF00', strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ROI and Conversion Dashboard Section */}
      <div id="conversion_roi_analysis" className="space-y-4 pt-4 border-t border-border/50">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#00FF00]" />
          Análise de Conversão e ROI (CRM)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-black border-[#00FF00]/30 shadow-[0_4px_20px_-2px_rgba(0,255,0,0.15)] rounded-lg">
            <CardContent className="p-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Taxa de Conversão (IA {`->`} Venda)
                </p>
                <p className="text-3xl font-bold text-[#00FF00]">{aiConversionToSaleRate}%</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00FF00]/10 flex items-center justify-center border border-[#00FF00]/20">
                <TrendingUp className="text-[#00FF00] w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-[#00FF00]/30 shadow-[0_4px_20px_-2px_rgba(0,255,0,0.15)] rounded-lg">
            <CardContent className="p-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Vendas Geradas (IA)</p>
                <p
                  className="text-3xl font-bold text-[#00FF00] truncate max-w-[150px]"
                  title={formattedTotalSales}
                >
                  {formattedTotalSales}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#00FF00]/10 flex items-center justify-center border border-[#00FF00]/20">
                <DollarSign className="text-[#00FF00] w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-black border-[#8A2BE2]/30 shadow-[0_4px_20px_-2px_rgba(138,43,226,0.15)] rounded-lg">
            <CardContent className="p-6 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Tempo Médio Conversão (Venda)
                </p>
                <p className="text-3xl font-bold text-[#8A2BE2]">
                  {avgConversionTimeDays}{' '}
                  <span className="text-lg text-muted-foreground">dias</span>
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[#8A2BE2]/10 flex items-center justify-center border border-[#8A2BE2]/20">
                <Timer className="text-[#8A2BE2] w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card className="bg-card border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                <XCircle className="w-5 h-5 text-[#333333]" />
                Principais Motivos de Perda (CRM)
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              {lostReasonsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lostReasonsData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                    <XAxis
                      type="number"
                      stroke="#666"
                      tick={{ fill: '#9CA3AF' }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke="#666"
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={120}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{
                        backgroundColor: 'rgba(10,10,10,0.9)',
                        border: '1px solid #333',
                        borderRadius: '8px',
                      }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Bar dataKey="value" fill="#333333" radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  Nenhum motivo de perda registrado
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-white flex items-center gap-2">
                <MessageSquareWarning className="w-5 h-5 text-primary" />
                Feedback de Qualidade do Lead
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto max-h-[350px]">
              {feedbacks.length > 0 ? (
                <div className="space-y-4 pr-2">
                  {feedbacks.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-lg bg-black/40 border border-border/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-sm">{f.nome}</span>
                        {getStatusBadge(f.status)}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        &quot;{f.lead_quality_feedback}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground py-10">
                  Nenhum feedback registrado
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Pie Chart */}
        <Card className="bg-card border-border col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10,10,10,0.9)',
                      border: '1px solid #333',
                      borderRadius: '8px',
                    }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Sem dados suficientes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line Chart */}
        <Card className="bg-card border-border col-span-1 lg:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Novos Leads (7 dias)</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#666"
                  tick={{ fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'rgba(10,10,10,0.9)',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#9CA3AF' }}
                  itemStyle={{ color: '#8A2BE2' }}
                />
                <Line
                  type="monotone"
                  dataKey="leads"
                  stroke="#8A2BE2"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#8A2BE2', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#00FF00', stroke: 'rgba(0,255,0,0.3)', strokeWidth: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium text-white">Leads Recentes</CardTitle>
          <Link
            to="/leads"
            className="text-sm text-primary hover:text-primary/80 flex items-center transition-colors"
          >
            Ver todos <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-border/50 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white">{lead.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.phone || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.lead_source || '-'}</td>
                    <td className="px-4 py-3">{getStatusBadge(lead.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {lead.created_at
                        ? format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm')
                        : '-'}
                    </td>
                  </tr>
                ))}
                {recentLeads.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum lead encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
