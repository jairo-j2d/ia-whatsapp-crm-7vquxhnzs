import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Navigate } from 'react-router-dom'
import { Bot } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, user } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await signIn(email, password)
    if (signInError) {
      setError(signInError.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md bg-card border-border shadow-2xl">
        <CardHeader className="space-y-2 items-center">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-2">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-white">
            IA WhatsApp CRM
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Acesso ao painel administrativo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-black/50 border-border text-white focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-black/50 border-border text-white focus-visible:ring-primary"
              />
            </div>
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
