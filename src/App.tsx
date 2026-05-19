import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import NewProject from './pages/NewProject';
import Config from './pages/Config';
import Results from './pages/Results';

function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-72 bg-slate-900 flex flex-col p-6 text-white border-l border-slate-800 shrink-0">
      <div className="mb-12 flex items-center gap-3">
        <div className="w-10 h-10 bg-emerald-500 flex items-center justify-center font-black text-2xl text-white rounded-xl">L</div>
        <h1 className="text-2xl font-black tracking-tighter uppercase">LinkMesh</h1>
      </div>
      
      <nav className="flex-grow flex flex-col gap-2">
        <Link 
          to="/" 
          className={`flex items-center gap-4 px-4 py-3 rounded-lg font-bold transition-colors ${isActive('/') ? 'bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <span>پروژه‌ها</span>
        </Link>
        <Link 
          to="/new" 
          className={`flex items-center gap-4 px-4 py-3 rounded-lg font-bold transition-colors ${isActive('/new') ? 'bg-emerald-500/10 text-emerald-400 border-r-4 border-emerald-500' : 'text-slate-400 hover:bg-slate-800'}`}
        >
          <span>ایجاد پروژه</span>
        </Link>
      </nav>

      <div className="mt-auto p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
        <p className="text-xs text-slate-500 mb-1">وضعیت هوش مصنوعی</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-sm font-medium text-slate-300">مدل Flash 3.1 آماده است</span>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
        <Sidebar />
        <main className="flex-grow flex flex-col px-10 py-8 overflow-y-auto w-full">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/new" element={<NewProject />} />
            <Route path="/config/:projectId" element={<Config />} />
            <Route path="/results/:projectId" element={<Results />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
