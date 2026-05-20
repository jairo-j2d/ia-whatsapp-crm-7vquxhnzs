import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Users, BookOpen, LogOut, Menu, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export default function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/knowledge', label: 'Conhecimento', icon: BookOpen },
  ]

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center gap-3">
        <Bot className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-bold text-white tracking-tight">CRM IA</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium',
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-colors"
          onClick={handleSignOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair do Sistema
        </Button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex-col hidden md:flex">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border bg-card flex items-center px-4 justify-between z-10">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold text-white">CRM IA</h1>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-card border-r-border flex flex-col">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
