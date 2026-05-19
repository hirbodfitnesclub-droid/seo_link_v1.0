import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { CATEGORIES } from '@/constants/categories';
import { Button } from '@/components/ui/Button';
import { db } from '@/db';
import { Settings2, SlidersHorizontal, Key, Link as LinkIcon, AlertCircle } from 'lucide-react';

export default function Config() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { project, weights, loading } = useProject(projectId);
  
  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Initialize values
  useEffect(() => {
    const storedKey = localStorage.getItem('LINKMESH_API_KEY') || '';
    setApiKey(storedKey);
  }, []);

  useEffect(() => {
    if (weights !== undefined) {
      const initialWeights: Record<string, number> = {};
      CATEGORIES.forEach(cat => {
        const existingWeight = weights.find(w => w.category_name === cat.name);
        initialWeights[cat.name] = existingWeight ? existingWeight.weight_value : cat.defaultWeight;
      });
      setLocalWeights(initialWeights);
    }
  }, [weights]);

  const handleModeChange = async (mode: 'linear' | 'weighted') => {
    if (project?.id) {
      await db.projects.update(project.id, { scoring_mode: mode });
    }
  };

  const handleMaxLinksChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (project?.id) {
      await db.projects.update(project.id, { max_links: parseInt(e.target.value, 10) });
    }
  };

  const handleWeightChange = (categoryName: string, value: number) => {
    setLocalWeights(prev => ({
      ...prev,
      [categoryName]: value
    }));
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('LINKMESH_API_KEY', val);
  };

  const handleStartAnalysis = async () => {
    setError(null);
    if (!apiKey.trim()) {
      setError('لطفاً کلید API (Gemini) را وارد کنید.');
      return;
    }

    if (!project?.id) return;

    try {
      // Prepare weights for upsert: find existing IDs to properly bulkPut, or just use category_name as secondary key if we have to. 
      // bulkPut needs primary keys to update. If we don't have the primary key, bulkPut inserts new records. 
      // But we can just find them.
      const weightsToPut = CATEGORIES.map(cat => {
        const existing = weights?.find(w => w.category_name === cat.name);
        return {
          ...(existing?.id ? { id: existing.id } : {}),
          project_id: project.id!,
          category_name: cat.name,
          weight_value: localWeights[cat.name] || cat.defaultWeight
        };
      });

      await db.weights.bulkPut(weightsToPut);

      navigate(`/results/${project.id}?analyze=true`);
    } catch (err: any) {
      setError(`خطا در ذخیره‌سازی تنظیمات: ${err.message}`);
    }
  };

  if (loading || !project) {
    return <div className="text-center py-20 text-slate-500 font-bold">در حال بارگذاری تنظیمات...</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="mb-8 shrink-0 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">تنظیمات امتیازدهی</h2>
          <p className="text-slate-500">پروژه: <span className="font-bold text-slate-700">{project.name}</span></p>
        </div>
      </header>

      <div className="flex flex-col gap-6 flex-grow overflow-y-auto pb-10">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-3 shrink-0">
             <AlertCircle className="w-5 h-5" />
             <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Section 1: Scoring Mode */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm shrink-0">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-emerald-500" />
            روش امتیازدهی
          </h3>
          
          <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
            <button 
              className={`px-8 py-3 rounded-xl font-bold transition-all ${project.scoring_mode === 'linear' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => handleModeChange('linear')}
            >
              خطی (بدون ضریب)
            </button>
            <button 
              className={`px-8 py-3 rounded-xl font-bold transition-all ${project.scoring_mode === 'weighted' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => handleModeChange('weighted')}
            >
              ضریب‌دار (پیشرفته)
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-4">
            {project.scoring_mode === 'linear' 
              ? 'در روش خطی، تطابق هر دسته‌بندی ۱ امتیاز دارد.' 
              : 'در روش ضریب‌دار، اهمیت (وزن) هر دسته‌بندی قابل تنظیم است.'}
          </p>
        </div>

        {/* Section 2: Weights (Visible only if weighted) */}
        {project.scoring_mode === 'weighted' && (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm shrink-0 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <SlidersHorizontal className="w-6 h-6 text-emerald-500" />
              تنظیم ضرایب دسته‌بندی‌ها
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {CATEGORIES.map(cat => (
                <div key={cat.name} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-700 text-sm">{cat.name.replace(/_/g, ' ')}</label>
                    <span className="bg-white px-3 py-1 rounded-lg border border-slate-200 font-black text-emerald-600 text-sm">
                      {localWeights[cat.name] || cat.defaultWeight}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    step="1"
                    value={localWeights[cat.name] || cat.defaultWeight}
                    onChange={(e) => handleWeightChange(cat.name, parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-slate-400 font-medium font-mono" dir="ltr">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3 & 4: Links & API Key */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col justify-center">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <LinkIcon className="w-6 h-6 text-emerald-500" />
              حداکثر لینک پیشنهادی
            </h3>
            <select 
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer text-lg"
              value={project.max_links || 10}
              onChange={handleMaxLinksChange}
            >
              <option value={5}>۵ لینک برای هر صفحه</option>
              <option value={10}>۱۰ لینک برای هر صفحه</option>
              <option value={15}>۱۵ لینک برای هر صفحه</option>
            </select>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
              <Key className="w-6 h-6 text-emerald-500" />
              کلید API
            </h3>
            <div className="flex flex-col gap-2">
              <input 
                type="password" 
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder="Gemini API Key..."
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 outline-none transition-colors text-slate-700 bg-slate-50 focus:bg-white text-lg font-mono text-left"
                dir="ltr"
              />
              <p className="text-xs text-slate-500">کلید شما فقط در مرورگر شما (Local Storage) ذخیره می‌شود.</p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-6 shrink-0">
          <Button 
            variant="emerald" 
            className="w-full text-xl py-5 rounded-[2rem]"
            onClick={handleStartAnalysis}
          >
            ذخیره تنظیمات و شروع پردازش هوش مصنوعی
          </Button>
        </div>
      </div>
    </div>
  );
}
