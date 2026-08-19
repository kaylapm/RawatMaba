import React, { useState } from 'react';

export default function BatchUploadModal({ isOpen, onClose, onBatchSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!file) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onBatchSuccess(file.name);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden relative my-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white flex justify-between items-start">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-300 bg-white/10 px-2.5 py-0.5 rounded-full font-sans-code">
              Batch CSV Import
            </span>
            <h3 className="font-merriweather font-bold text-xl text-white mt-1">
              Batch Upload Nilai Maba
            </h3>
            <p className="text-xs text-slate-300 font-sans-code mt-1">
              Upload file CSV/Excel rekapitulasi nilai kelompok.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleUploadSubmit} className="p-6 space-y-5 text-xs font-sans-code">
          
          {/* Dropzone */}
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragActive ? 'border-gsm-blue bg-blue-50/50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
            }`}
          >
            <div className="w-14 h-14 bg-blue-100 text-gsm-blue rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <span className="material-symbols-outlined text-3xl">cloud_upload</span>
            </div>
            
            <p className="font-bold text-slate-800 text-sm mb-1">
              {file ? file.name : 'Tarik & Lepas File CSV / Excel Di Sini'}
            </p>
            <p className="text-slate-500 text-xs mb-4 font-mono">
              Format yang didukung: .csv, .xlsx (Maks. 10MB)
            </p>

            <label className="inline-block bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl cursor-pointer transition-all shadow-md">
              <span>Pilih File Dari Komputer</span>
              <input type="file" accept=".csv,.xlsx" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {/* Template Info */}
          <div className="bg-blue-50/80 p-3.5 rounded-xl border border-blue-200 text-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-gsm-blue text-lg">download_for_offline</span>
              <div>
                <p className="font-bold text-slate-900 text-[11px]">Download Template CSV GSM</p>
                <p className="text-[10px] text-slate-500">Gunakan format header kolom standar panitia.</p>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => alert('Download Template CSV Rawat Maba dimulai.')}
              className="text-[11px] font-bold text-gsm-blue underline"
            >
              Unduh Template
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={!file || isProcessing}
              className="px-6 py-2 rounded-xl bg-gsm-blue hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-md transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">upload</span>
              <span>{isProcessing ? 'Memproses Import...' : 'Import Data Nilai'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
