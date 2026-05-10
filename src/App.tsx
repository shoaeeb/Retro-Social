import React, { useState, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Globe, 
  Gamepad2,
  HardDrive,
  Monitor,
  LogIn,
  Power
} from 'lucide-react';

import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';

function DesktopLayout({ children }: { children: ReactNode }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-retro-teal relative overflow-hidden crt-overlay cursor-default select-none font-mono">
      {/* Desktop Icons */}
      <div className="absolute top-0 left-0 p-4 grid grid-cols-1 w-24 gap-8 z-0">
        <DesktopIcon icon={<HardDrive size={32} />} label="My System" />
        <DesktopIcon icon={<Trash2 size={32} />} label="Recycle Bin" />
        <DesktopIcon icon={<Globe size={32} />} label="The Web" />
        <DesktopIcon icon={<Gamepad2 size={32} />} label="Fun Zones" />
      </div>

      {/* Main Content (Windows) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {children}
      </div>

      {/* Taskbar */}
      <div className="absolute bottom-0 left-0 right-0 h-10 window-frame flex items-center justify-between px-1 z-50">
        <div className="flex items-center gap-1 h-full">
          <button className="retro-button font-bold text-xs h-8 flex items-center gap-1 px-3 shadow-none">
            <div className="bg-gradient-to-br from-retro-blue to-blue-500 p-0.5 rounded-sm">
              <Monitor size={14} className="text-white" />
            </div>
            START
          </button>
          <div className="h-6 w-[2px] bg-gray-400 mx-1" />
          <div className="flex gap-1" id="taskbar-tasks">
            <ActiveTask icon={<LogIn size={14} />} label="RetroSocial" />
          </div>
        </div>

        <div className="window-frame border-t-gray-600 border-l-gray-600 border-b-white border-r-white px-3 h-8 flex items-center gap-3 text-xs bg-retro-gray shadow-none">
          <div className="flex gap-2">
            <Globe size={14} className="text-gray-600" />
            <Power size={14} className="text-gray-600" />
          </div>
          <span className="font-bold border-l border-gray-400 pl-3">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

function DesktopIcon({ icon, label }: { icon: ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group cursor-pointer pointer-events-auto">
      <div className="text-white group-hover:bg-retro-blue p-1 rounded-sm transition-colors border border-transparent group-hover:border-white">
        {icon}
      </div>
      <span className="bg-transparent text-white text-[10px] font-bold px-1 group-hover:bg-retro-blue shadow-sm text-center line-clamp-2">
        {label}
      </span>
    </div>
  );
}

function ActiveTask({ icon, label }: { icon: ReactNode, label: string }) {
  return (
    <div className="retro-button h-8 text-[11px] font-bold min-w-[100px] justify-start bg-gray-100 ring-1 ring-retro-blue/10 shadow-none border-t-gray-800 border-l-gray-800 border-b-white border-r-white">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DesktopLayout>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/home" element={<HomePage />} />
        </Routes>
      </DesktopLayout>
    </BrowserRouter>
  );
}
