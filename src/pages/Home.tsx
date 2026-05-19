import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Trash2, Settings, BarChart2 } from 'lucide-react';

export default function Home() {
  const projects = useLiveQuery(() => db.projects.orderBy('created_at').reverse().toArray());
  const pagesCount = useLiveQuery(() => db.pages.count());
  const resultsCount = useLiveQuery(() => db.results.count());
  const navigate = useNavigate();

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!window.confirm('آیا از حذف این پروژه مطمئن هستید؟ تمام داده‌های آن پاک خواهند شد.')) return;

    try {
      await db.transaction('rw', db.projects, db.pages, db.weights, db.results, async () => {
        await db.projects.delete(id);
        await db.pages.where({ project_id: id }).delete();
        await db.weights.where({ project_id: id }).delete();
        await db.results.where({ project_id: id }).delete();
      });
    } catch (err) {
      console.error(err);
      alert('خطا در حذف پروژه');
    }
  };

  if (projects === undefined) {
    return <div className="text-center py-20 text-slate-500 font-bold">در حال بارگذاری...</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex justify-between items-start mb-10 shrink-0">
        <div>
          <h2 className="text-5xl font-black text-slate-900 mb-2 leading-tight">پنل مدیریت<br/><span className="text-emerald-600 italic">پروژه‌ها</span></h2>
          <p className="text-slate-500 text-lg">مدیریت هوشمند لینکسازی داخلی بر پایه شباهت معنایی</p>
        </div>
        <Link to="/new">
          <Button variant="emerald" className="rounded-2xl px-8 py-4 text-lg">
            <span className="text-2xl ml-3">+</span>
            ایجاد پروژه جدید
          </Button>
        </Link>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-6 mb-10 shrink-0">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col gap-1 shadow-sm">
          <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">کل صفحات</span>
          <span className="text-4xl font-black text-slate-900 tracking-tight">{pagesCount?.toLocaleString('fa-IR') ?? 0}</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col gap-1 shadow-sm">
          <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">لینک‌های هوشمند</span>
          <span className="text-4xl font-black text-emerald-600 tracking-tight">{resultsCount?.toLocaleString('fa-IR') ?? 0}</span>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col gap-1 shadow-sm">
          <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">پروژه‌های فعال</span>
          <span className="text-4xl font-black text-slate-900 tracking-tight">{projects.length.toLocaleString('fa-IR')}</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col min-h-0">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-3 shrink-0">
          <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
          پروژه‌های اخیر
        </h3>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
            <h2 className="text-2xl font-black text-slate-700 mb-2">هیچ پروژه‌ای یافت نشد</h2>
            <p className="text-slate-500 mb-6 text-center">برای شروع اولین پروژه خود را ایجاد کنید.</p>
            <Link to="/new">
              <Button variant="primary">ایجاد پروژه</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 pb-12 overflow-y-auto">
            {projects.map((project, index) => {
              const icons = ["🏝️", "🏨", "✈️", "🗺️", "🚀", "🏔️"];
              const icon = icons[index % icons.length];
              return (
              <div key={project.id} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 hover:border-emerald-500 transition-all group flex flex-col cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-emerald-50 transition-colors">{icon}</div>
                  <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">آماده پردازش</div>
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-2 truncate" title={project.name}>{project.name}</h4>
                <div className="flex gap-4 text-slate-400 text-sm font-medium mb-8">
                  <span dir="ltr">{new Date(project.created_at).toLocaleDateString('fa-IR')}</span>
                </div>
                
                <div className="mt-auto flex gap-3">
                  <Button 
                    variant="primary" 
                    className="flex-grow"
                    onClick={(e) => { e.stopPropagation(); navigate(`/results/${project.id}`); }}
                  >
                    مشاهده نتایج
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-grow"
                    onClick={(e) => { e.stopPropagation(); navigate(`/config/${project.id}`); }}
                  >
                    تنظیمات
                  </Button>
                  <Button 
                    variant="danger" 
                    className="w-12 h-12 p-0 shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                    title="حذف"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* Global Action Bar */}
      <div className="mt-auto pt-6 border-t border-slate-200 flex justify-between items-center text-slate-400 font-medium shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm tracking-widest uppercase font-black opacity-30">V1.0.0 Stable</span>
          <span className="text-xs">ساخته شده برای تیم SEO نهال گشت</span>
        </div>
        <div className="text-sm">قدرت گرفته از Gemini 3.1 Flash Lite</div>
      </div>
    </div>
  );
}
