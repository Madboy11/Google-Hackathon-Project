import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useNexusContext } from '../context/NexusContext';
import { Activity, LayoutDashboard, Route, Package2, ShieldAlert } from 'lucide-react';

export const Layout: React.FC = () => {
  const { backendLive } = useNexusContext();
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={14} /> },
    { name: 'Fleet Logistics', path: '/logger', icon: <Route size={14} /> },
    { name: 'Inventory', path: '/inventory', icon: <Package2 size={14} /> },
    { name: 'Security Logs', path: '/security', icon: <ShieldAlert size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-nexus-bg text-nexus-text font-inter flex flex-col">
      {/* ─── Top Header ─── */}
      <header className="border-b border-nexus-border shrink-0">
        <div className="max-w-[1800px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <div className="w-6 h-6 border border-nexus-border-active flex items-center justify-center">
                <div className="w-2 h-2 bg-white"></div>
              </div>
              <div>
                <h1 className="text-sm font-grotesk font-bold tracking-[0.15em] text-nexus-accent">
                  NEXUS-SC
                </h1>
                <p className="text-[9px] font-grotesk tracking-[0.25em] text-nexus-muted mt-0.5">
                  GLOBAL RISK COMMAND
                </p>
              </div>
            </div>

            {/* Main Nav */}
            <nav className="hidden md:flex items-center gap-6 border-l border-nexus-border pl-8">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 text-xs font-grotesk tracking-widest uppercase transition-colors ${
                      isActive ? 'text-nexus-accent font-semibold' : 'text-nexus-muted hover:text-nexus-text'
                    }`}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 inline-block ${backendLive ? 'bg-white' : 'bg-nexus-subtle'}`}></span>
              <span className="text-[10px] font-grotesk tracking-[0.15em] text-nexus-muted">
                {backendLive === null ? 'CONNECTING' : backendLive ? 'LIVE' : 'MOCK'}
              </span>
            </div>
            <div className="text-[10px] font-grotesk tracking-[0.15em] text-nexus-muted tabular-nums">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Page Content Engine ─── */}
      <main className="flex-1 w-full max-w-[1800px] mx-auto overflow-hidden flex flex-col">
          <Outlet />
      </main>
    </div>
  );
};
