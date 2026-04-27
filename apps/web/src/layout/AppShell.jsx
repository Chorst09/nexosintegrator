import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen text-[var(--crm-ink)]">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/20 motion-safe:animate-float" />
        <div className="absolute bottom-[-9rem] left-[-8rem] h-[30rem] w-[30rem] rounded-full bg-sky-500/10 blur-3xl dark:bg-sky-400/20 motion-safe:animate-float" />
      </div>

      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      <main className="relative z-10 flex-1 min-w-0 overflow-y-auto" id="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <div className="px-4 sm:px-6 lg:px-8 pb-12 pt-6">
          <div className="mx-auto w-full max-w-[1400px]">
            <div>
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
