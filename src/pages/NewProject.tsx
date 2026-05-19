import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { parseCSV, ParsedRow, ParseResult } from '@/utils/csvParser';
import { db } from '@/db';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function NewProject() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setParsedData(null);
    
    if (!selectedFile.name.endsWith('.csv')) {
      setError('لطفاً یک فایل CSV معتبر آپلود کنید.');
      return;
    }

    try {
      const result = await parseCSV(selectedFile);
      setParsedData(result);
      if (!projectName) {
        setProjectName(selectedFile.name.replace('.csv', ''));
      }
    } catch (err: any) {
      setError(err.message || 'خطای ناشناخته در پارس فایل');
    }
  };

  const handleSave = async () => {
    if (!parsedData || !projectName.trim()) {
      setError('لطفاً نام پروژه و فایل معتبر را وارد کنید.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create project
      const projectId = await db.projects.add({
        name: projectName.trim(),
        created_at: new Date().toISOString(),
        scoring_mode: 'linear',
        max_links: 10
      });

      // 2. Prepare pages data for bulkAdd
      const pagesToInsert = parsedData.rows.map(row => ({
        project_id: projectId,
        title: row.title,
        categories: row.categories
      }));

      // 3. Bulk insert pages
      await db.pages.bulkAdd(pagesToInsert);

      // Navigate to config
      navigate(`/config/${projectId}`);
    } catch (err: any) {
      setError(`خطا در ذخیره‌سازی: ${err.message || 'نامشخص'}`);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="mb-8 shrink-0">
        <h2 className="text-4xl font-black text-slate-900 mb-2">ایجاد پروژه جدید</h2>
        <p className="text-slate-500">فایل CSV حاوی لیست صفحات را آپلود کنید تا تحلیل هوشمند شروع شود.</p>
      </header>

      <div className="flex flex-col gap-6 flex-grow overflow-y-auto pb-10">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-3 shrink-0">
             <AlertCircle className="w-5 h-5" />
             <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Step A: Upload Area */}
        <div 
          className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[250px] shrink-0
            ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white hover:bg-slate-50'}
            ${parsedData ? 'hidden' : 'flex'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileChange}
          />
          <div className={`w-20 h-20 rounded-full mb-4 flex items-center justify-center transition-colors
            ${isDragging ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}
          `}>
            <UploadCloud className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-slate-700 mb-2">
            فایل CSV را اینجا رها کنید یا کلیک کنید
          </h3>
          <p className="text-slate-500 text-sm">
            فقط فایل‌های دارای پسوند .csv پشتیبانی می‌شوند.
          </p>
        </div>

        {/* Step B: Preview Area */}
        {parsedData && (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* File Info */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1">{file?.name}</h3>
                  <p className="text-emerald-700 text-sm font-medium">پارس با موفقیت انجام شد: {parsedData.totalCount.toLocaleString('fa-IR')} ردیف یافت شد.</p>
                </div>
              </div>
              <Button variant="secondary" onClick={() => setParsedData(null)}>
                تغییر فایل
              </Button>
            </div>

            {/* Project Config Form */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-500" />
                اطلاعات پروژه
              </h3>
              
              <div className="flex flex-col gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">نام پروژه</label>
                  <input 
                    type="text" 
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="مثلاً: نهال‌گشت آذر ۱۴۰۵"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:ring-0 outline-none transition-colors text-slate-700 bg-slate-50 focus:bg-white text-lg"
                  />
                </div>

                <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 font-bold text-sm text-slate-700">
                    پیش‌نمایش داده‌ها (۵ ردیف اول)
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs">
                        <tr>
                          <th className="px-4 py-3 border-b font-medium w-12 text-center">#</th>
                          <th className="px-4 py-3 border-b border-l border-slate-200 font-medium">عنوان (H1)</th>
                          <th className="px-4 py-3 border-b font-medium">وضعیت دسته‌بندی‌ها</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {parsedData.rows.slice(0, 5).map((row, idx) => {
                          const cats = JSON.parse(row.categories);
                          const filledCats = Object.values(cats).filter(v => v !== null).length;
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 border-b border-slate-100 text-slate-400 text-center font-mono opacity-50">{idx + 1}</td>
                              <td className="px-4 py-3 border-b border-l border-slate-100 font-medium text-slate-800">{row.title}</td>
                              <td className="px-4 py-3 border-b border-slate-100">
                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${filledCats > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                  {filledCats} از ۱۸ تکمیل
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="pt-6">
                  <Button 
                    variant="emerald" 
                    className="w-full text-xl py-4 rounded-2xl"
                    loading={loading}
                    onClick={handleSave}
                  >
                    ذخیره پروژه و ادامه
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
