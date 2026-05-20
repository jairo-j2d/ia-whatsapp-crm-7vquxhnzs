import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { documentsService, Document } from '@/services/documents'
import { memoryService } from '@/services/memory'
import { Activity, BookOpen, FileText, BarChart3, Database as DbIcon } from 'lucide-react'

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [stats, setStats] = useState({ avgMessages: 0, totalSessions: 0 })

  useEffect(() => {
    fetchDocuments()
    fetchStats()

    const channel = documentsService.subscribeToDocuments(() => {
      fetchDocuments()
    })

    return () => {
      documentsService.unsubscribeDocuments(channel)
    }
  }, [])

  const fetchDocuments = async () => {
    try {
      const data = await documentsService.getDocuments()
      setDocuments(data)
    } catch (error) {
      console.error('Error fetching docs:', error)
    } finally {
      setLoadingDocs(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Basic aggregate calculation for memory
      const allMemories = await memoryService.getAllMemories()
      if (allMemories && allMemories.length > 0) {
        const sessionCounts = allMemories.reduce(
          (acc, mem) => {
            acc[mem.session_id] = (acc[mem.session_id] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        )

        const sessions = Object.keys(sessionCounts).length
        const avg = allMemories.length / sessions

        setStats({
          totalSessions: sessions,
          avgMessages: Math.round(avg * 10) / 10,
        })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Conhecimento IA</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie a base de conhecimento e visualize a performance da IA.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="bg-card border-border glow-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <DbIcon className="w-4 h-4 mr-2 text-primary" /> Total de Documentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{documents.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Textos vetoriais na base</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-[0_4px_20px_-2px_rgba(0,255,0,0.1)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-secondary" /> Média de Interações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats.avgMessages}{' '}
              <span className="text-lg font-normal text-muted-foreground">msgs/sessão</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Calculado em {stats.totalSessions} sessões únicas
            </p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg font-medium text-white mb-4 flex items-center">
        <BookOpen className="w-5 h-5 mr-2 text-primary" /> Base de Textos Vetoriais (RAG)
      </h3>

      {loadingDocs ? (
        <div className="flex justify-center py-12">
          <Activity className="animate-spin text-primary w-8 h-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const meta = (doc.metadata as any) || {}
            return (
              <Card
                key={doc.id}
                className="bg-black/50 border-border hover:border-primary/50 transition-colors group"
              >
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-medium text-white group-hover:text-primary transition-colors line-clamp-1">
                      {meta.title ||
                        (doc.content
                          ? doc.content.substring(0, 20) + '...'
                          : 'Documento sem título')}
                    </CardTitle>
                    <FileText className="w-4 h-4 text-muted-foreground opacity-50" />
                  </div>
                  {meta.category && (
                    <CardDescription className="text-xs text-primary/80 mt-1 uppercase tracking-wider font-medium">
                      {meta.category}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                    {doc.content}
                  </p>
                </CardContent>
              </Card>
            )
          })}
          {documents.length === 0 && (
            <div className="col-span-full text-center py-12 border border-dashed border-border rounded-lg">
              <p className="text-muted-foreground">Nenhum dado encontrado</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
