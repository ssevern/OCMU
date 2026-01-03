
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Beer, Trophy, Trash2, ChevronRight, X, Star, Pencil, Monitor, ChevronLeft, Download, ArrowDownUp, FileText, Presentation, Calendar, RefreshCw, AlertTriangle, Check, Trash } from 'lucide-react';
import { TastingBeer, BeerFeedback } from './types';
import { FeedbackView } from './components/FeedbackView';
import { LOGO_SVG } from './constants';
import { BJCP_2021_STYLES } from './bjcpStyles';
import pptxgen from "pptxgenjs";

const STORAGE_KEY = 'ocmu_mashup_v4_lite_final';

const App: React.FC = () => {
  const [beers, setBeers] = useState<TastingBeer[]>([]);
  const [feedback, setFeedback] = useState<BeerFeedback[]>([]);
  const [activeView, setActiveView] = useState<'flight' | 'standings'>('flight');
  const [standingsSubView, setStandingsSubView] = useState<'beers' | 'brewers'>('beers');
  const [showRegister, setShowRegister] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [presentationIndex, setPresentationIndex] = useState(0);
  const [editingBeerId, setEditingBeerId] = useState<string | null>(null);
  const [judgingBeer, setJudgingBeer] = useState<TastingBeer | null>(null);
  const [summaryBeer, setSummaryBeer] = useState<TastingBeer | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  const [newBeer, setNewBeer] = useState<Partial<TastingBeer>>({
    brewer: '',
    style: ''
  });

  const loadData = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.beers) setBeers(parsed.beers);
        if (parsed.feedback) setFeedback(parsed.feedback);
      } catch (e) { 
        console.error("Load failed", e); 
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const data = JSON.stringify({ beers, feedback });
    localStorage.setItem(STORAGE_KEY, data);
  }, [beers, feedback]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const allBJCPStyles = useMemo(() => BJCP_2021_STYLES.flatMap(cat => cat.styles), []);

  const sortedBeers = useMemo(() => {
    if (!showOptimizer) return beers;
    return [...beers].sort((a, b) => {
      const getCatValue = (style: string) => {
        const match = style.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 999;
      };
      return getCatValue(a.style) - getCatValue(b.style);
    });
  }, [beers, showOptimizer]);

  const handleRegisterClick = () => {
    setEditingBeerId(null);
    setNewBeer({ brewer: '', style: '' });
    setShowRegister(true);
  };

  const handleEditClick = (beer: TastingBeer) => {
    setEditingBeerId(beer.id);
    setNewBeer({ brewer: beer.brewer, style: beer.style });
    setShowRegister(true);
  };

  const handleSaveBeer = () => {
    if (!newBeer.style || !newBeer.brewer) return;
    
    if (editingBeerId) {
      setBeers(prev => prev.map(b => b.id === editingBeerId ? {
        ...b,
        style: newBeer.style!,
        brewer: newBeer.brewer!
      } : b));
    } else {
      const beer: TastingBeer = {
        id: `beer-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        style: newBeer.style,
        brewer: newBeer.brewer,
        abv: '0',
        ibu: '0',
        description: '',
        flightPosition: beers.length,
        registeredAt: Date.now()
      };
      setBeers(prev => [...prev, beer]);
    }
    
    setNewBeer({ brewer: '', style: '' });
    setEditingBeerId(null);
    setShowRegister(false);
  };

  const executeDelete = (id: string) => {
    setBeers(prev => prev.filter(b => b.id !== id));
    setFeedback(prev => prev.filter(f => f.beerId !== id));
    setConfirmDeleteId(null);
  };

  const beerLeaderboard = useMemo(() => {
    const stats = beers.map(beer => {
      const bFeedback = feedback.filter(f => f.beerId === beer.id);
      const avg = bFeedback.length 
        ? bFeedback.reduce((acc, f) => acc + (f.aroma + f.appearance + f.flavor + f.mouthfeel + f.overall), 0) / bFeedback.length
        : 0;
      return { ...beer, avg, count: bFeedback.length };
    });
    return stats.sort((a, b) => b.avg - a.avg);
  }, [beers, feedback]);

  const brewerLeaderboard = useMemo(() => {
    const brewersMap: Record<string, { total: number, count: number }> = {};
    feedback.forEach(f => {
      const score = f.aroma + f.appearance + f.flavor + f.mouthfeel + f.overall;
      if (!brewersMap[f.brewerName]) {
        brewersMap[f.brewerName] = { total: 0, count: 0 };
      }
      brewersMap[f.brewerName].total += score;
      brewersMap[f.brewerName].count += 1;
    });

    return Object.entries(brewersMap)
      .map(([name, stats]) => ({
        name,
        avg: stats.total / stats.count,
        reviews: stats.count
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [feedback]);

  const exportCSV = () => {
    const headers = ["Flight #", "Brewer", "Style", "Judge", "Aroma", "Appearance", "Flavor", "Mouthfeel", "Overall", "Total", "Notes"];
    const rows = feedback.map(f => {
      const beer = beers.find(b => b.id === f.beerId);
      const total = f.aroma + f.appearance + f.flavor + f.mouthfeel + f.overall;
      return [
        (beers.indexOf(beer!) + 1).toString(),
        f.brewerName,
        beer?.style || "Unknown",
        f.judgeName,
        f.aroma.toString(),
        f.appearance.toString(),
        f.flavor.toString(),
        f.mouthfeel.toString(),
        f.overall.toString(),
        total.toString(),
        `"${f.notes.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ocmu_session_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPPTX = () => {
    const pres = new pptxgen();
    const orange = "F6A028";
    const black = "1A1A1A";
    const white = "FFFFFF";

    let titleSlide = pres.addSlide();
    titleSlide.background = { color: black };
    titleSlide.addText("ORANGE COUNTY MASH UPS", {
      x: 0, y: "40%", w: "100%", h: 1,
      align: "center", fontFace: "Montserrat", fontSize: 44, bold: true, color: orange, italic: true
    });
    titleSlide.addText(`SESSION: ${new Date().toLocaleDateString('en-US')}`, {
      x: 0, y: "55%", w: "100%", h: 0.5,
      align: "center", fontFace: "Montserrat", fontSize: 18, color: white, charSpacing: 4
    });

    beers.forEach((beer, idx) => {
      let slide = pres.addSlide();
      slide.background = { color: black };
      slide.addText(`ENTRY #${idx + 1}`, {
        x: 0.5, y: 0.5, w: 3, h: 0.5,
        align: "left", fontFace: "Montserrat", fontSize: 24, bold: true, color: orange, italic: true
      });
      slide.addText(beer.style.toUpperCase(), {
        x: 0.5, y: "40%", w: "90%", h: 1,
        align: "center", fontFace: "Montserrat", fontSize: 54, bold: true, color: white
      });
      slide.addShape(pres.ShapeType.rect, { x: "40%", y: "55%", w: "20%", h: 0.05, fill: { color: orange } });
      slide.addText(`BREWED BY: ${beer.brewer}`, {
        x: 0.5, y: "65%", w: "90%", h: 0.5,
        align: "center", fontFace: "Montserrat", fontSize: 28, color: orange, italic: true
      });
    });

    pres.writeFile({ fileName: `OCMU_Session_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.pptx` });
  };

  if (showPresentation) {
    const currentBeer = sortedBeers[presentationIndex];
    return (
      <div className="fixed inset-0 bg-[#1A1A1A] z-[2000] flex flex-col text-white animate-in fade-in zoom-in duration-500">
        <header className="p-8 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
             <span className="font-black uppercase tracking-[0.4em] text-[#F6A028] text-xs">ORANGE COUNTY MASH UPS</span>
          </div>
          <button onClick={() => setShowPresentation(false)} className="p-4 bg-white/5 rounded-full hover:bg-white/10 transition-all">
            <X size={32} />
          </button>
        </header>
        <main className="flex-grow flex flex-col items-center justify-center p-10 text-center">
          {currentBeer ? (
            <div className="max-w-6xl w-full">
              <span className="text-[#F6A028] font-black uppercase tracking-[1em] text-xl md:text-3xl mb-12 block opacity-50">NOW SERVING</span>
              <h2 className="text-[120px] md:text-[240px] font-black italic uppercase leading-none tracking-tighter mb-12">#{presentationIndex + 1}</h2>
              <div className="bg-white/5 p-12 md:p-24 rounded-[60px] md:rounded-[100px] border-4 border-[#F6A028] shadow-[0_0_100px_rgba(246,160,40,0.2)]">
                <p className="text-2xl md:text-5xl font-black uppercase tracking-widest text-[#F6A028] mb-6">{currentBeer.style}</p>
                <div className="w-24 h-2 bg-white/20 mx-auto mb-8" />
                <h3 className="text-3xl md:text-7xl font-black uppercase italic">Brewed by: {currentBeer.brewer}</h3>
              </div>
            </div>
          ) : (
            <p className="text-4xl font-black opacity-20 uppercase">No entries to display</p>
          )}
        </main>
        <footer className="p-8 flex justify-between items-center bg-black/40 backdrop-blur-xl">
           <button 
             onClick={() => setPresentationIndex(prev => Math.max(0, prev - 1))}
             disabled={presentationIndex === 0}
             className="px-10 py-6 bg-white/5 rounded-3xl font-black uppercase tracking-widest disabled:opacity-10 hover:bg-white/10 flex items-center gap-4"
           >
             <ChevronLeft size={32} /> Prev
           </button>
           <div className="text-2xl font-black text-[#F6A028]">{presentationIndex + 1} <span className="text-white/20">/</span> {sortedBeers.length}</div>
           <button 
             onClick={() => setPresentationIndex(prev => Math.min(sortedBeers.length - 1, prev + 1))}
             disabled={presentationIndex === sortedBeers.length - 1}
             className="px-10 py-6 bg-[#F6A028] text-black rounded-3xl font-black uppercase tracking-widest disabled:opacity-10 hover:brightness-110 flex items-center gap-4"
           >
             Next <ChevronRight size={32} />
           </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-[#1A1A1A]">
      {judgingBeer && (
        <FeedbackView 
          beer={judgingBeer} 
          onClose={() => setJudgingBeer(null)} 
          onSubmit={(f) => setFeedback([...feedback, { ...f, id: `fb-${Date.now()}`, timestamp: Date.now() }])} 
        />
      )}

      {summaryBeer && (
        <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl md:rounded-[48px] rounded-t-[40px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-t-8 border-[#F6A028]">
             <div className="p-8 bg-[#1A1A1A] text-white flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black uppercase italic leading-none">{summaryBeer.style}</h3>
                   <p className="text-[10px] font-black uppercase text-[#F6A028] tracking-widest mt-1">BREWER: {summaryBeer.brewer}</p>
                </div>
                <button onClick={() => setSummaryBeer(null)} className="p-3 bg-white/10 rounded-full hover:rotate-90 transition-all"><X size={24} /></button>
             </div>
             <div className="flex-grow overflow-y-auto p-8 space-y-8">
                {feedback.filter(f => f.beerId === summaryBeer.id).length === 0 ? (
                  <div className="text-center py-12 opacity-30 italic font-black uppercase tracking-widest">Awaiting feedback...</div>
                ) : (
                  feedback.filter(f => f.beerId === summaryBeer.id).map(f => (
                    <div key={f.id} className="bg-gray-50 p-6 rounded-[32px] border-2 border-gray-100 space-y-4">
                       <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">JUDGE: {f.judgeName}</span>
                            <div className="flex gap-1 mt-1">
                               {f.descriptors.slice(0, 5).map(d => (
                                 <span key={d} className="px-2 py-0.5 bg-[#F6A028]/10 text-[#F6A028] rounded-md font-black text-[8px] uppercase">{d}</span>
                               ))}
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-3xl font-black italic tracking-tighter leading-none">{f.aroma + f.appearance + f.flavor + f.mouthfeel + f.overall}</div>
                             <div className="text-[8px] font-black uppercase text-gray-400 tracking-widest">SCORE</div>
                          </div>
                       </div>
                       <p className="text-sm font-slab font-bold text-gray-700 italic border-l-4 border-[#F6A028] pl-4">"{f.notes}"</p>
                    </div>
                  ))
                )}
             </div>
             <div className="p-6 border-t bg-gray-50 flex justify-center">
                <button onClick={() => setSummaryBeer(null)} className="px-10 py-4 bg-[#1A1A1A] text-white font-black uppercase tracking-widest text-xs rounded-2xl">Close Report</button>
             </div>
          </div>
        </div>
      )}

      {confirmDeleteId && (
        <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center shadow-2xl border-b-8 border-red-500">
            <Trash2 size={48} className="text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black uppercase italic mb-2">Confirm Delete?</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 leading-relaxed">THIS WILL PERMANENTLY REMOVE THE ENTRY AND ALL ITS SCORES.</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                className="py-4 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={() => executeDelete(confirmDeleteId)}
                className="py-4 bg-red-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-[#1A1A1A] text-white p-3 md:p-4 sticky top-0 z-50 border-b-[4px] border-[#F6A028] shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={handleRefresh}
              className={`p-1.5 hover:bg-white/10 rounded-lg transition-all ${isRefreshing ? 'animate-spin text-[#F6A028]' : 'text-white/40'}`}
              title="Sync Data"
            >
              <RefreshCw size={18} />
            </button>
            <div className="w-8 h-8 md:w-12 md:h-12 shrink-0" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
            <div className="flex flex-col">
              <h1 className="text-sm md:text-2xl font-black uppercase italic tracking-tighter leading-none">
                ORANGE COUNTY MASH UPS
              </h1>
              <span className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.4em] text-[#F6A028] mt-0.5">JUDGING HUB</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleRegisterClick}
              className="bg-[#F6A028] text-black px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg"
            >
              <Plus size={16} /> <span className="hidden md:inline">Entry</span>
            </button>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 sticky top-[58px] md:top-[80px] z-40">
        <div className="max-w-6xl mx-auto flex items-stretch">
          <button 
            onClick={() => setActiveView('flight')}
            className={`flex-1 py-4 font-black uppercase text-[9px] md:text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeView === 'flight' ? 'text-[#F6A028] border-b-2 border-[#F6A028] bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Beer size={16} /> Flight
          </button>
          <button 
            onClick={() => setActiveView('standings')}
            className={`flex-1 py-4 font-black uppercase text-[9px] md:text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeView === 'standings' ? 'text-[#F6A028] border-b-2 border-[#F6A028] bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <Trophy size={16} /> Standings
          </button>
          <div className="flex bg-gray-50 px-2 md:px-4 items-center border-l border-gray-100">
             <button 
               onClick={() => setShowOptimizer(!showOptimizer)}
               className={`p-1.5 px-2 md:px-3 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest flex items-center gap-1.5 transition-all border-2 ${showOptimizer ? 'bg-[#1A1A1A] text-[#F6A028] border-[#1A1A1A]' : 'bg-white text-gray-300 border-gray-100'}`}
               title="Sort by Category"
             >
                <ArrowDownUp size={12} /> <span className="hidden sm:inline">Optimize</span>
             </button>
          </div>
        </div>
      </div>

      <main className="flex-grow p-2 md:p-6 max-w-6xl mx-auto w-full pb-20">
        {activeView === 'flight' ? (
          <div className="flex flex-col gap-2">
            {sortedBeers.length === 0 ? (
              <div className="text-center py-20 opacity-20">
                <Beer size={60} className="mx-auto mb-3" />
                <p className="font-black uppercase tracking-widest italic text-[10px]">No entries registered yet</p>
              </div>
            ) : (
              sortedBeers.map((beer, idx) => {
                const bFeedback = feedback.filter(f => f.beerId === beer.id);
                const regDate = beer.registeredAt ? new Date(beer.registeredAt).toLocaleDateString('en-US') : null;
                return (
                  <div key={beer.id} className="bg-white rounded-xl p-2 md:p-3 shadow-sm border border-gray-200 hover:border-[#F6A028] transition-all flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-2 md:gap-4 flex-grow min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className="w-9 h-9 md:w-11 md:h-11 bg-[#1A1A1A] text-[#F6A028] rounded-lg flex items-center justify-center font-black text-xs md:text-base italic">#{idx + 1}</div>
                        {bFeedback.length > 0 && (
                          <div className="absolute -top-1.5 -right-1.5 bg-[#F6A028] text-black text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{bFeedback.length}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <h3 className="text-[12px] md:text-base font-black uppercase italic leading-tight truncate">{beer.style}</h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                           <p className="text-[7px] md:text-[9px] font-black uppercase text-gray-400 tracking-widest leading-none truncate">BREWER: {beer.brewer}</p>
                           {regDate && (
                             <span className="flex items-center gap-0.5 text-[7px] md:text-[8px] font-bold text-gray-200 uppercase italic leading-none">
                               <Calendar size={8} /> {regDate}
                             </span>
                           )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-3 ml-2 flex-shrink-0">
                      <div className="flex gap-1 md:gap-1.5">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSummaryBeer(beer); }}
                          className="p-2 md:p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-lg transition-all"
                          title="View Feedback"
                        >
                           <FileText size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setJudgingBeer(beer); }}
                          className="px-3 py-2 md:px-5 md:py-2.5 bg-[#1A1A1A] text-white rounded-lg font-black uppercase text-[9px] md:text-[11px] tracking-[0.05em] flex items-center gap-1.5 hover:bg-[#F6A028] hover:text-black transition-all"
                        >
                          Score <ChevronRight size={12} className="hidden md:inline" />
                        </button>
                      </div>
                      <div className="h-6 w-px bg-gray-100 mx-0.5" />
                      <div className="flex gap-0.5 md:gap-1">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditClick(beer); }} 
                          className="p-2 md:p-2.5 text-gray-300 hover:text-[#1A1A1A] transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(beer.id); }} 
                          className="p-2 md:p-2.5 text-gray-200 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="flex bg-white rounded-xl p-1 border border-gray-100 w-full md:w-auto">
                <button onClick={() => setStandingsSubView('beers')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all ${standingsSubView === 'beers' ? 'bg-[#1A1A1A] text-[#F6A028]' : 'text-gray-400'}`}>Rankings</button>
                <button onClick={() => setStandingsSubView('brewers')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest transition-all ${standingsSubView === 'brewers' ? 'bg-[#1A1A1A] text-[#F6A028]' : 'text-gray-400'}`}>Brewers</button>
              </div>
              <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto">
                <button onClick={exportCSV} className="shrink-0 px-4 py-2 bg-white text-[#1A1A1A] border border-gray-200 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-all shadow-sm">
                   <Download size={14} /> CSV
                </button>
                <button onClick={exportPPTX} className="shrink-0 px-4 py-2 bg-white text-[#F6A028] border border-gray-200 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 hover:bg-gray-50 transition-all shadow-sm">
                   <Presentation size={14} /> PPTX
                </button>
                <button onClick={() => setShowPresentation(true)} className="shrink-0 px-4 py-2 bg-[#1A1A1A] text-[#F6A028] rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center justify-center gap-1.5 hover:scale-105 transition-all shadow-lg">
                   <Monitor size={14} /> LIVE
                </button>
              </div>
            </div>

            {standingsSubView === 'beers' && (
              <div className="space-y-3">
                <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter mb-2 flex items-center gap-2">
                  <Trophy className="text-[#F6A028]" size={24} /> Session Rankings
                </h2>
                {beerLeaderboard.length === 0 ? (
                  <div className="text-center py-20 opacity-20 italic uppercase tracking-widest font-black text-xs">Awaiting flight reviews...</div>
                ) : (
                  beerLeaderboard.map((beer, idx) => (
                    <div key={beer.id} className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-l-[8px] transition-all bg-white shadow-sm border-[#1A1A1A] ${idx === 0 ? 'scale-[1.01] border-[#F6A028] shadow-md z-10' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 md:gap-6">
                          <span className={`text-xl md:text-2xl font-black italic ${idx === 0 ? 'text-[#F6A028]' : 'text-gray-200'}`}>#{idx + 1}</span>
                          <div>
                            <h4 className="text-sm md:text-lg font-black uppercase italic leading-none mb-0.5">{beer.style}</h4>
                            <p className="text-[8px] md:text-xs font-black text-gray-400 uppercase tracking-widest">{beer.brewer}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl md:text-3xl font-black leading-none italic tracking-tighter ${idx === 0 ? 'text-[#1A1A1A]' : 'text-gray-400'}`}>{beer.avg.toFixed(1)}</div>
                          <div className="text-[6px] md:text-[8px] font-black uppercase tracking-widest text-[#F6A028]">AVG</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {standingsSubView === 'brewers' && (
              <div className="space-y-3 animate-in slide-in-from-bottom-4">
                <h2 className="text-xl md:text-3xl font-black uppercase italic tracking-tighter mb-2 flex items-center gap-2">
                  <Star className="text-[#F6A028]" size={24} /> Top Brewers
                </h2>
                {brewerLeaderboard.length === 0 ? (
                  <div className="text-center py-20 opacity-20 italic uppercase tracking-widest font-black text-xs">No reviews yet...</div>
                ) : (
                  brewerLeaderboard.map((brewer, idx) => (
                    <div key={brewer.name} className={`p-3 md:p-4 rounded-xl md:rounded-2xl border-l-[8px] transition-all bg-white shadow-sm border-[#1A1A1A] ${idx === 0 ? 'scale-[1.01] border-[#F6A028] shadow-md z-10' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 md:gap-6">
                          <span className={`text-xl md:text-2xl font-black italic ${idx === 0 ? 'text-[#F6A028]' : 'text-gray-200'}`}>#{idx + 1}</span>
                          <div>
                            <h4 className="text-sm md:text-lg font-black uppercase italic leading-none mb-0.5">{brewer.name}</h4>
                            <p className="text-[8px] md:text-xs font-black text-gray-400 uppercase tracking-widest">{brewer.reviews} Total Reviews</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl md:text-3xl font-black leading-none italic tracking-tighter ${idx === 0 ? 'text-[#1A1A1A]' : 'text-gray-400'}`}>{brewer.avg.toFixed(1)}</div>
                          <div className="text-[6px] md:text-[8px] font-black uppercase tracking-widest text-[#F6A028]">BREWER AVG</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {showRegister && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-6 bg-[#1A1A1A] text-white flex justify-between items-center border-b-[6px] border-[#F6A028]">
              <h2 className="text-xl font-black uppercase italic">{editingBeerId ? 'Update Entry' : 'New Entry'}</h2>
              <button onClick={() => { setShowRegister(false); setEditingBeerId(null); }} className="p-2 bg-white/10 rounded-full hover:rotate-90 transition-all"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block">BREWER NAME</label>
                <input 
                  type="text" 
                  className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl font-black outline-none focus:border-[#F6A028]" 
                  value={newBeer.brewer} 
                  onChange={e => setNewBeer({...newBeer, brewer: e.target.value})} 
                  placeholder="e.g. John Smith"
                />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block">BJCP STYLE</label>
                <select 
                  className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl font-black outline-none focus:border-[#F6A028]" 
                  value={newBeer.style} 
                  onChange={e => setNewBeer({...newBeer, style: e.target.value})}
                >
                  <option value="">Select Style...</option>
                  {allBJCPStyles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button 
                onClick={handleSaveBeer} 
                className="w-full py-5 bg-[#1A1A1A] text-[#F6A028] font-black uppercase tracking-[0.2em] rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-xl"
              >
                {editingBeerId ? 'Save Changes' : 'Confirm Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#1A1A1A] py-16 px-6 text-center border-t-8 border-[#F6A028]">
        <div className="max-w-xl mx-auto space-y-8">
           <div className="w-16 h-16 mx-auto opacity-20" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
           <div className="text-white/10 font-black uppercase tracking-[0.5em] italic text-[10px]">
             ORANGE COUNTY MASH UPS • FLIGHT MANAGER v5.1
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
