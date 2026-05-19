import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { leadsService, Lead } from '@/services/leads'
import { Activity, Users, PhoneForwarded, CheckCircle2, ArrowRight, Filter } from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
  LineChart,
  Line,
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
      const data = await leadsService.getLeads()
      setLeads(data)
    } catch (error) {
      console.error('Error fetching leads:', error)
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

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'em_atendimento':
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/30">
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
        return (
          <Badge className="bg-cyan-500/20 text-cyan-500 hover:bg-cyan-500/30 border-cyan-500/30">
            Finalizado
          </Badge>
        )
      case 'ativo':
        return (
          <Badge className="bg-secondary/20 text-secondary hover:bg-secondary/30 border-secondary/30">
            Ativo
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
            Inativo
          </Badge>
        )
    }
  }

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
