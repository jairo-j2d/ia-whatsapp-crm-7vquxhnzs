import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Settings,
  LogOut,
  Activity,
  RefreshCw,
  User,
} from 'lucide-react'
import { Button } from './ui/button'
import AuthPage from '@/pages/Auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { Avatar, AvatarFallback } from './ui/avatar'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export default function Layout() {
  const { user, signOut, loading } = useAuth()
  const location = useLocation()
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Activity className="animate-spin text-primary w-8 h-8" />
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    window.location.reload()
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Leads / CRM', path: '/leads', icon: Users },
    { name: 'Conhecimento IA', path: '/knowledge', icon: BookOpen },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-sidebar border-r border-r-primary/20 flex flex-col transition-all duration-300">
        <div className="h-16 flex items-center px-6 border-b border-b-border">
          <Activity className="text-primary w-6 h-6 mr-3" />
          <span className="font-bold text-lg tracking-wide text-white">Agent CRM</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path))
            return (
              <Link key={item.path} to={item.path}>
                <div
                  className={cn(
                    'flex items-center px-4 py-3 rounded-lg transition-all duration-200 group cursor-pointer',
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(138,43,226,0.2)]'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-white',
                  )}
                >
                  <item.icon
                    className={cn(
                      'w-5 h-5 mr-3 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-white',
                    )}
                  />
                  <span className="font-medium">{item.name}</span>
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-t-border">
          <div className="flex items-center px-4 py-3 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-white transition-all cursor-not-allowed opacity-50">
            <Settings className="w-5 h-5 mr-3" />
            <span className="font-medium">Configurações</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 flex-shrink-0 bg-black/80 backdrop-blur-md border-b border-b-border flex items-center justify-between px-8 z-10">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">
              {navItems.find(
                (i) =>
                  location.pathname === i.path ||
                  (i.path !== '/' && location.pathname.startsWith(i.path)),
              )?.name || 'Dashboard'}
            </h1>
            <div className="ml-6 flex items-center bg-card px-3 py-1.5 rounded-full border border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary mr-2 animate-pulse-glow"></div>
              <span className="text-xs font-medium text-secondary">Sistema Online</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-border bg-card hover:bg-white/10 text-white"
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')} />
              Atualizar
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border border-primary/50">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-card border-border text-white"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Usuário Logado</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                  className="cursor-pointer hover:bg-white/10 focus:bg-white/10 focus:text-white"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background p-8 animate-fade-in relative z-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
