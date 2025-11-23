import { ReactNode, useState } from 'react'
import Sidebar from './Sidebar'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen w-full bg-background-light dark:bg-background-dark font-display text-[#111418] dark:text-gray-200">
      {/* Mobile hamburger button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-background-dark border border-gray-200 dark:border-gray-700 shadow-sm"
        aria-label="Toggle menu"
      >
        <span className="material-symbols-outlined text-[#111418] dark:text-gray-200">
          {sidebarOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Sidebar - hidden on mobile, overlay when open */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto md:ml-0">
        {children}
      </main>
    </div>
  )
}


