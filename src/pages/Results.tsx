import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useProject } from '@/hooks/useProject';
import { db } from '@/db';
import { computeAllCandidates } from '@/utils/scorer';
import { buildPrompt, callGemini } from '@/utils/gemini';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Download, 
  RefreshCw, 
  Home, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Link as LinkIcon, 
  Calendar 
} from 'lucide-react';

export default function Results() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isAnalyzing = searchParams.get('analyze') === 'true';
  const { project, pages, weights, results, loading } = useProject(projectId);

  const [analyzeStep, setAnalyzeStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const joinedResults = useMemo(() => {
    if (!results || !pages) return [];
    return results.map(result => {
      const sourcePage = pages.find(p => p.id === result.source_page_id);
      let recommendedLinks = [];
      try {
        recommendedLinks = JSON.parse(result.recommended_links);
      } catch(e) {}
      
      return {
        id: result.id!,
        source_page_id: result.source_page_id,
        source_title: sourcePage?.title || 'عنوان نامشخص',
        recommended_links: recommendedLinks,
        generated_at: result.generated_at
      };
    });
  }, [results, pages]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return joinedResults;
    return joinedResults.filter(r => r.source_title.includes(searchQuery));
  }, [joinedResults, searchQuery]);

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const handleExportCSV = () => {
    const rows = ['عنوان صفحه منبع,عنوان لینک پیشنهادی,دلیل'];
    joinedResults.forEach(result => {
      result.recommended_links.forEach((link: any) => {
        rows.push(`"${result.source_title}","${link.title}","${link.reason}"`);
      });
    });
    const csvContent = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `linkmesh_results_${project?.name || projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalLinks = joinedResults.reduce((acc, curr) => acc + curr.recommended_links.length, 0);
  const avgLinks = joinedResults.length > 0 ? (totalLinks / joinedResults.length).toFixed(1) : '۰';

  useEffect(() => {
    async function runAnalysis() {
      if (!isAnalyzing || loading || !project || !pages || !weights) return;

      const apiKey = localStorage.getItem('LINKMESH_API_KEY');
      if (!apiKey) {
        setError('کلید API وارد نشده است. لطفاً به صفحه تنظیمات بروید.');
        setAnalyzeStep(null);
        return;
      }

      try {
        setAnalyzeStep('در حال امتیازدهی...');
        // Convert weights array to Record
        const weightsRecord: Record<string, number> = {};
        weights.forEach((w) => {
          weightsRecord[w.category_name] = w.weight_value;
        });

        // Add a small delay to allow UI to update
        await new Promise(resolve => setTimeout(resolve, 50));

        const candidatesMap = computeAllCandidates(
          pages as any[],
          weightsRecord,
          project.scoring_mode as 'linear' | 'weighted'
        );

        setAnalyzeStep('ساخت درخواست برای هوش مصنوعی...');
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const prompt = buildPrompt(pages as any[], candidatesMap, project.max_links);

        setAnalyzeStep('در حال تحلیل با هوش مصنوعی (Gemini)...');
        const geminiResponse = await callGemini(prompt, apiKey);

        setAnalyzeStep('در حال ذخیره‌سازی نتایج...');
        const generatedAt = new Date().toISOString();
        const resultsToInsert = geminiResponse.map((item: any) => ({
          project_id: project.id!,
          source_page_id: item.source_page_id,
          recommended_links: JSON.stringify(item.recommended_links || []),
          generated_at: generatedAt,
        }));

        await db.transaction('rw', db.results, async () => {
          await db.results.where('project_id').equals(project.id!).delete();
          await db.results.bulkAdd(resultsToInsert);
        });

        setAnalyzeStep(null);
        // Remove ?analyze=true from URL
        searchParams.delete('analyze');
        setSearchParams(searchParams, { replace: true });
      } catch (err: any) {
        setAnalyzeStep(null);
        setError(err.message || 'خطای ناشناخته در زمان تحلیل رخ داد.');
      }
    }

    runAnalysis();
  }, [isAnalyzing, loading, project, pages, weights, searchParams, setSearchParams]);

  if (loading) {
    return <div className="text-center py-20 text-slate-500 font-bold">در حال بارگذاری...</div>;
  }

  if (analyzeStep) {
    return (
      <div className="flex flex-col items-center justify-center py-32 h-full">
        <Spinner className="w-16 h-16 text-emerald-500 mb-8" />
        <h2 className="text-2xl font-black text-slate-800 mb-2">{analyzeStep}</h2>
        <p className="text-slate-500">لطفاً تا پایان این مرحله صفحه را نبندید.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-red-50 text-red-600 p-8 rounded-[2rem] border-2 border-red-200 flex flex-col items-center max-w-lg text-center">
          <AlertCircle className="w-16 h-16 mb-4 opacity-80" />
          <h2 className="text-xl font-bold mb-2">خطا در تحلیل</h2>
          <p className="mb-8 font-medium">{error}</p>
          <Button variant="danger" onClick={() => navigate(`/config/${projectId}`)}>
            بازگشت به تنظیمات
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="mb-6 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
         <div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">نتایج تحلیل</h2>
          <p className="text-slate-500">پروژه: <span className="font-bold text-slate-700">{project?.name}</span></p>
         </div>
         <div className="flex items-center gap-3">
           <Button variant="secondary" onClick={() => navigate('/')}>
             <Home className="w-5 h-5 ml-2" />
             خانه
           </Button>
           <Button variant="emerald" onClick={handleExportCSV}>
             <Download className="w-5 h-5 ml-2" />
             دانلود CSV
           </Button>
           <Button variant="secondary" onClick={() => navigate(`/config/${projectId}`)}>
             <RefreshCw className="w-5 h-5 ml-2" />
             تحلیل مجدد
           </Button>
         </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 shrink-0">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">صفحات تحلیل‌شده</p>
            <p className="text-2xl font-black text-slate-900">{joinedResults.length.toLocaleString('fa-IR')}</p>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <LinkIcon className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 mb-1">میانگین لینک پیشنهادی</p>
            <p className="text-2xl font-black text-slate-900" dir="ltr">{avgLinks}</p>
          </div>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-500 mb-1">تاریخ آخرین تحلیل</p>
            <p className="text-sm font-black text-slate-900 mt-2 truncate" dir="ltr">
              {joinedResults[0]?.generated_at ? new Date(joinedResults[0].generated_at).toLocaleString('fa-IR') : 'نامشخص'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border text-sm border-slate-200 rounded-[2rem] flex flex-col flex-grow min-h-0 overflow-hidden shadow-sm">
        {/* Search Header */}
        <div className="p-6 border-b border-slate-100 shrink-0 flex gap-4 bg-slate-50/50">
          <div className="relative flex-grow">
            <Search className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="جستجو در عنوان صفحات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pr-12 pl-4 outline-none focus:border-emerald-500 transition-colors font-medium text-slate-700"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-grow p-6 pt-0 bg-slate-50/50">
          <div className="flex flex-col gap-3 mt-6">
            {filteredResults.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-bold">موردی یافت نشد.</div>
            ) : (
              filteredResults.map(row => {
                const isExpanded = expandedRows.has(row.id);
                return (
                  <div key={row.id} className={`bg-white rounded-2xl border transition-all ${isExpanded ? 'border-emerald-200 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
                    {/* Row Header */}
                    <div 
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer select-none gap-4"
                      onClick={() => toggleRow(row.id)}
                    >
                      <div className="flex items-center gap-4">
                        <Badge variant={row.recommended_links.length > 0 ? 'emerald' : 'default'} className="shrink-0 pt-1.5">
                          {row.recommended_links.length} لینک
                        </Badge>
                        <h4 className="font-bold text-slate-800 line-clamp-1">{row.source_title}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-slate-400 shrink-0 self-end sm:self-auto">
                        <span className="flex items-center gap-2 hover:text-emerald-600 transition-colors font-bold text-sm bg-slate-50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          {isExpanded ? 'بستن' : 'نمایش لینک‌ها'}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-4 bg-slate-50/50 rounded-b-2xl">
                        {row.recommended_links.length === 0 ? (
                          <div className="text-slate-500 text-sm py-2 font-medium">هیچ لینکی پیشنهاد نشده است.</div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {row.recommended_links.map((link: any, idx: number) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="font-bold text-slate-800 text-sm flex items-start gap-2">
                                  <LinkIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                  <span>{link.title}</span>
                                </div>
                                <div className="text-slate-500 text-xs bg-slate-50 p-3 rounded-lg leading-relaxed border border-slate-100">
                                  <span className="font-bold text-slate-700 ml-2">دلیل انتخاب:</span>
                                  {link.reason}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
