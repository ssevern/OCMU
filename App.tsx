
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Beer, Trophy, Trash2, ChevronRight, X, Star, Pencil, Monitor, ChevronLeft, Download, ArrowDownUp, FileText, Presentation, Calendar, RefreshCw, AlertTriangle, Check, Trash, Cloud, CloudOff, Share2, Link as LinkIcon, Users, Copy, Loader2, Info, Settings, Radio } from 'lucide-react';
import { TastingBeer, BeerFeedback } from './types';
import { FeedbackView } from './components/FeedbackView';
import { LOGO_SVG } from './constants';
import { BJCP_2021_STYLES } from './bjcpStyles';
import pptxgen from "pptxgenjs";

const STORAGE_KEY = 'ocmu_mashup_v4_lite_final';
const SESSION_KEY = 'ocmu_session_id';
// Switched to JSONBlob which is significantly more reliable for unauthenticated POST/PUT
const SYNC_API = 'https://jsonblob.com/api/jsonBlob'; 

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
  
  // Cloud Sync State
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem(SESSION_KEY));
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastSyncTime = useRef<number>(0);

  const [newBeer, setNewBeer] = useState<Partial<TastingBeer>>({
    brewer: '',
    style: ''
  });

  // --- CLOUD SYNC LOGIC ---

  const pushToCloud = useCallback(async (currentBeers: TastingBeer[], currentFeedback: BeerFeedback[]) => {
    if (!sessionId) return;
    setIsSyncing(true);
    try {
      const resp = await fetch(`${SYNC_API}/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beers: currentBeers, feedback: currentFeedback, lastUpdate: Date.now() })
      });
      if (!resp.ok) throw new Error(`Push failed: ${resp.status}`);
      lastSyncTime.current = Date.now();
    } catch (e) {
      console.error("Cloud push failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [sessionId]);

  const pullFromCloud = useCallback(async (force = false) => {
    if (!sessionId) return;
    if (!force && isSyncing) return;
    
    setIsSyncing(true);
    try {
      const resp = await fetch(`${SYNC_API}/${sessionId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.lastUpdate > lastSyncTime.current || force)) {
          if (data.beers) setBeers(data.beers);
          if (data.feedback) setFeedback(data.feedback);
          lastSyncTime.current = data.lastUpdate || Date.now();
        }
      } else if (resp.status === 404) {
        setSyncError("Session expired or invalid.");
        setSessionId(null);
        localStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {
      console.error("Cloud pull failed", e);
    } finally {
      setIsSyncing(false);
    }
  }, [sessionId, isSyncing]);

  const createSession = async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const resp = await fetch(SYNC_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beers, feedback, lastUpdate: Date.now() })
      });
      
      if (!resp.ok) throw new Error(`Server returned ${resp.status}`);
      
      // JSONBlob sends the ID in the Location header
      const location = resp.headers.get('Location');
      if (!location) throw new Error("Could not retrieve session location from server.");
      
      const id = location.split('/').pop();
      if (!id) throw new Error("Could not parse session ID.");
      
      setSessionId(id);
      localStorage.setItem(SESSION_KEY, id);
      setShowSyncModal(false);
      lastSyncTime.current = Date.now();
    } catch (e: any) {
      console.error("Session creation error:", e);
      setSyncError(e.message);
      alert(`Sync Error: ${e.message}. Please check your connection.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const joinSession = async (id?: string) => {
    const targetId = (id || joinCode).trim();
    if (!targetId) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      const resp = await fetch(`${SYNC_API}/${targetId}`);
      if (resp.ok) {
        const data = await resp.json();
        setSessionId(targetId);
        localStorage.setItem(SESSION_KEY, targetId);
        if (data.beers) setBeers(data.beers);
        if (data.feedback) setFeedback(data.feedback);
        lastSyncTime.current = data.lastUpdate || Date.now();
        setShowSyncModal(false);
        setJoinCode('');
      } else {
        throw new Error(resp.status === 404 ? "Session not found." : "Connection error.");
      }
    } catch (e: any) {
      setSyncError(e.message);
      alert(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const leaveSession = () => {
    if (window.confirm("Leave cloud session? Data will remain local to this device.")) {
      setSessionId(null);
      localStorage.removeItem(SESSION_KEY);
      setShowSyncModal(false);
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    navigator.clipboard.writeText(url);
    alert("Share link copied! Give this to other judges.");
  };

  // --- INITIAL LOAD & POLLING ---

  useEffect(() => {
    const init = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && !sessionId) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.beers) setBeers(parsed.beers);
          if (parsed.feedback) setFeedback(parsed.feedback);
        } catch (e) {}
      }

      const urlParams = new URLSearchParams(window.location.search);
      const urlSid = urlParams.get('session');
      if (urlSid) {
        await joinSession(urlSid);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (sessionId) {
        await pullFromCloud(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (sessionId) {
      const interval = setInterval(() => pullFromCloud(), 12000);
      return () => clearInterval(interval);
    }
  }, [sessionId, pullFromCloud]);

  useEffect(() => {
    const data = JSON.stringify({ beers, feedback });
    localStorage.setItem(STORAGE_KEY, data);
  }, [beers, feedback]);

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
    
    let updatedBeers: TastingBeer[];
    if (editingBeerId) {
      updatedBeers = beers.map(b => b.id === editingBeerId ? {
        ...b,
        style: newBeer.style!,
        brewer: newBeer.brewer!
      } : b);
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
      updatedBeers = [...beers, beer];
    }
    
    setBeers(updatedBeers);
    if (sessionId) pushToCloud(updatedBeers, feedback);
    
    setNewBeer({ brewer: '', style: '' });
    setEditingBeerId(null);
    setShowRegister(false);
  };

  const executeDelete = (id: string) => {
    const updatedBeers = beers.filter(b => b.id !== id);
    const updatedFeedback = feedback.filter(f => f.beerId !== id);
    setBeers(updatedBeers);
    setFeedback(updatedFeedback);
    if (sessionId) pushToCloud(updatedBeers, updatedFeedback);
    setConfirmDeleteId(null);
  };

  const handleFeedbackSubmit = (f: Omit<BeerFeedback, 'id' | 'timestamp'>) => {
    const newFb = { ...f, id: `fb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, timestamp: Date.now() };
    const updatedFeedback = [...feedback, newFb];
    setFeedback(updatedFeedback);
    if (sessionId) pushToCloud(beers, updatedFeedback);
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
    link.setAttribute("download", `OCMU_Session_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPPTX = () => {
    const pres = new pptxgen();
    const orange = "F6A028";
    const black = "1A1A1A";
    const white = "FFFFFF";

    pres.layout = 'LAYOUT_WIDE';

    // SLIDE 1: OCMU TITLE MASTER
    let titleSlide = pres.addSlide();
    titleSlide.background = { color: black };
    
    // Crosshair Vector Logic
    titleSlide.addShape(pres.ShapeType.line, { x: 0, y: "50%", w: "100%", h: 0, line: { color: orange, width: 2, dashType: 'dash' } });
    titleSlide.addShape(pres.ShapeType.line, { x: "50%", y: 0, w: 0, h: "100%", line: { color: orange, width: 2, dashType: 'dash' } });
    titleSlide.addShape(pres.ShapeType.ellipse, { x: "42%", y: "35%", w: "16%", h: "30%", line: { color: white, width: 6 } });
    titleSlide.addShape(pres.ShapeType.line, { x: "42%", y: "35%", w: "16%", h: "30%", line: { color: orange, width: 2 } });

    titleSlide.addText("ORANGE COUNTY\nMASH UPS", {
      x: 0, y: "38%", w: "100%", h: 2,
      align: "center", fontFace: "Montserrat", fontSize: 64, bold: true, color: orange, italic: true
    });
    
    titleSlide.addText(`PRESENTATION DECK • ${new Date().toLocaleDateString('en-US')}`, {
      x: 0, y: "85%", w: "100%", h: 0.5,
      align: "center", fontFace: "Montserrat", fontSize: 16, color: white, charSpacing: 8, bold: true
    });

    // ENTRY SLIDES: BRANDED CONTENT
    beers.forEach((beer, idx) => {
      let slide = pres.addSlide();
      slide.background = { color: black };
      
      // Branded Sidebar
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: 3, h: "100%", fill: { color: orange } });
      slide.addText(`ENTRY`, {
        x: 0, y: "32%", w: 3, h: 0.5,
        align: "center", fontFace: "Montserrat", fontSize: 32, bold: true, color: black
      });
      slide.addText(`${idx + 1}`, {
        x: 0, y: "45%", w: 3, h: 1.5,
        align: "center", fontFace: "Montserrat", fontSize: 130, bold: true, color: black, italic: true
      });

      // Style Typography
      slide.addText(beer.style.toUpperCase(), {
        x: 3.5, y: "35%", w: 9, h: 1.5,
        align: "left", fontFace: "Montserrat", fontSize: 72, bold: true, color: white
      });
      
      // Design Accent
      slide.addShape(pres.ShapeType.rect, { x: 3.5, y: "58%", w: 6, h: 0.1, fill: { color: orange } });
      
      // Brewer Info
      slide.addText(`BREWER: ${beer.brewer.toUpperCase()}`, {
        x: 3.5, y: "68%", w: 9, h: 0.8,
        align: "left", fontFace: "Montserrat", fontSize: 36, color: orange, italic: true, bold: true
      });
      
      // Footer Label
      slide.addText("OCMU FLIGHT MANAGER", {
        x: 10, y: "94%", w: 3, h: 0.3,
        align: "right", fontFace: "Montserrat", fontSize: 10, color: "333333", italic: true
      });
    });

    pres.writeFile({ fileName: `OCMU_Presentation_${new Date().toLocaleDateString('en-US').replace(/\//g, '-')}.pptx` });
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
           <button onClick={() => setPresentationIndex(prev => Math.max(0, prev - 1))} disabled={presentationIndex === 0} className="px-10 py-6 bg-white/5 rounded-3xl font-black uppercase tracking-widest disabled:opacity-10 hover:bg-white/10 flex items-center gap-4"><ChevronLeft size={32} /> Prev</button>
           <div className="text-2xl font-black text-[#F6A028]">{presentationIndex + 1} <span className="text-white/20">/</span> {sortedBeers.length}</div>
           <button onClick={() => setPresentationIndex(prev => Math.min(sortedBeers.length - 1, prev + 1))} disabled={presentationIndex === sortedBeers.length - 1} className="px-10 py-6 bg-[#F6A028] text-black rounded-3xl font-black uppercase tracking-widest disabled:opacity-10 hover:brightness-110 flex items-center gap-4">Next <ChevronRight size={32} /></button>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 text-[#1A1A1A]">
      {judgingBeer && <FeedbackView beer={judgingBeer} onClose={() => setJudgingBeer(null)} onSubmit={handleFeedbackSubmit} />}

      {summaryBeer && (
        <div className="fixed inset-0 z-[1100] bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center animate-in fade-in">
          <div className="bg-white w-full max-w-2xl md:rounded-[48px] rounded-t-[40px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-t-8 border-[#F6A028]">
             <div className="p-8 bg-[#1A1A1A] text-white flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-black uppercase italic leading-none">{summaryBeer.style}</h3>
                   <p className="text-[10px] font-black uppercase text-[#F6A028] tracking-widest mt-1">BREWER: {summaryBeer.brewer}</p>
                </div>
                <button onClick={() => setSummaryBeer(null)} className="p-3 bg-white/10 rounded-full"><X size={24} /></button>
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
              <button onClick={() => setConfirmDeleteId(null)} className="py-4 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px] tracking-widest">Cancel</button>
              <button onClick={() => executeDelete(confirmDeleteId)} className="py-4 bg-red-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest">Delete</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-[#1A1A1A] text-white p-3 md:p-4 sticky top-0 z-50 border-b-[4px] border-[#F6A028] shadow-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={() => setShowSyncModal(true)}
              className={`p-1.5 hover:bg-white/10 rounded-lg transition-all relative ${isSyncing ? 'animate-pulse' : ''}`}
            >
              {sessionId ? <Cloud className="text-green-500" size={20} /> : <CloudOff className="text-orange-400" size={20} />}
              {isSyncing && <Loader2 size={10} className="absolute -top-1 -right-1 animate-spin text-white bg-black rounded-full" />}
            </button>
            <div className="w-8 h-8 md:w-12 md:h-12 shrink-0" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
            <div className="flex flex-col">
              <h1 className="text-sm md:text-2xl font-black uppercase italic tracking-tighter leading-none">ORANGE COUNTY MASH UPS</h1>
              <span className="text-[6px] md:text-[8px] font-black uppercase tracking-[0.4em] text-[#F6A028] mt-0.5">JUDGING HUB</span>
            </div>
          </div>
          <button onClick={handleRegisterClick} className="bg-[#F6A028] text-black px-4 py-2 md:px-6 md:py-2.5 rounded-lg md:rounded-xl font-black uppercase text-[10px] md:text-xs tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-lg">
            <Plus size={16} /> <span className="hidden md:inline">Entry</span>
          </button>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 sticky top-[58px] md:top-[80px] z-40">
        <div className="max-w-6xl mx-auto flex items-stretch">
          <button onClick={() => setActiveView('flight')} className={`flex-1 py-4 font-black uppercase text-[9px] md:text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeView === 'flight' ? 'text-[#F6A028] border-b-2 border-[#F6A028] bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}><Beer size={16} /> Flight</button>
          <button onClick={() => setActiveView('standings')} className={`flex-1 py-4 font-black uppercase text-[9px] md:text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${activeView === 'standings' ? 'text-[#F6A028] border-b-2 border-[#F6A028] bg-gray-50' : 'text-gray-400 hover:text-gray-600'}`}><Trophy size={16} /> Standings</button>
          <div className="flex bg-gray-50 px-2 md:px-4 items-center border-l border-gray-100">
             <button onClick={() => setShowOptimizer(!showOptimizer)} className={`p-1.5 px-2 md:px-3 rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest flex items-center gap-1.5 transition-all border-2 ${showOptimizer ? 'bg-[#1A1A1A] text-[#F6A028] border-[#1A1A1A]' : 'bg-white text-gray-300 border-gray-100'}`}><ArrowDownUp size={12} /> <span className="hidden sm:inline">Optimize</span></button>
          </div>
        </div>
      </div>

      <main className="flex-grow p-2 md:p-6 max-w-6xl mx-auto w-full pb-20">
        {activeView === 'flight' ? (
          <div className="flex flex-col gap-2">
            {sortedBeers.length === 0 ? (
              <div className="text-center py-20 opacity-20"><Beer size={60} className="mx-auto mb-3" /><p className="font-black uppercase tracking-widest italic text-[10px]">No entries registered yet</p></div>
            ) : (
              sortedBeers.map((beer, idx) => {
                const bFeedback = feedback.filter(f => f.beerId === beer.id);
                return (
                  <div key={beer.id} className="bg-white rounded-xl p-2 md:p-3 shadow-sm border border-gray-200 hover:border-[#F6A028] transition-all flex items-center justify-between overflow-hidden">
                    <div className="flex items-center gap-2 md:gap-4 flex-grow min-w-0">
                      <div className="relative">
                        <div className="w-9 h-9 md:w-11 md:h-11 bg-[#1A1A1A] text-[#F6A028] rounded-lg flex items-center justify-center font-black text-xs md:text-base italic">#{idx + 1}</div>
                        {bFeedback.length > 0 && <div className="absolute -top-1.5 -right-1.5 bg-[#F6A028] text-black text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{bFeedback.length}</div>}
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <h3 className="text-[12px] md:text-base font-black uppercase italic leading-tight truncate">{beer.style}</h3>
                        <p className="text-[7px] md:text-[9px] font-black uppercase text-gray-400 tracking-widest truncate mt-0.5">BREWER: {beer.brewer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-3 ml-2">
                      <button onClick={() => setSummaryBeer(beer)} className="p-2 md:p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-lg transition-all"><FileText size={16} /></button>
                      <button onClick={() => setJudgingBeer(beer)} className="px-3 py-2 md:px-5 md:py-2.5 bg-[#1A1A1A] text-white rounded-lg font-black uppercase text-[9px] md:text-[11px] tracking-widest hover:bg-[#F6A028] hover:text-black transition-all">Score</button>
                      <div className="h-6 w-px bg-gray-100 mx-0.5" />
                      <button onClick={() => handleEditClick(beer)} className="p-2 text-gray-300 hover:text-[#1A1A1A]"><Pencil size={16} /></button>
                      <button onClick={() => setConfirmDeleteId(beer.id)} className="p-2 text-gray-200 hover:text-red-500"><Trash2 size={18} /></button>
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
                <button onClick={exportCSV} className="shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5"><Download size={14} /> CSV</button>
                <button onClick={exportPPTX} className="shrink-0 px-4 py-2 bg-white text-[#F6A028] border border-gray-200 rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5"><Presentation size={14} /> PPTX</button>
                <button onClick={() => setShowPresentation(true)} className="shrink-0 px-4 py-2 bg-[#1A1A1A] text-[#F6A028] rounded-lg font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5 shadow-lg"><Monitor size={14} /> LIVE</button>
              </div>
            </div>
            {beerLeaderboard.length === 0 ? (
               <div className="text-center py-20 opacity-20 italic uppercase font-black text-xs">No scores yet...</div>
            ) : (
               beerLeaderboard.map((beer, idx) => (
                  <div key={beer.id} className={`p-4 rounded-2xl bg-white shadow-sm border-l-[8px] transition-all ${idx === 0 ? 'border-[#F6A028]' : 'border-[#1A1A1A]'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className={`text-xl font-black italic ${idx === 0 ? 'text-[#F6A028]' : 'text-gray-200'}`}>#{idx + 1}</span>
                        <div><h4 className="font-black uppercase italic leading-none">{beer.style}</h4><p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-1">{beer.brewer}</p></div>
                      </div>
                      <div className="text-right"><div className="text-2xl font-black italic tracking-tighter">{beer.avg.toFixed(1)}</div><div className="text-[6px] font-black uppercase text-[#F6A028]">AVG</div></div>
                    </div>
                  </div>
               ))
            )}
          </div>
        )}
      </main>

      {showSyncModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl border-b-8 border-[#F6A028]">
            <div className="p-6 bg-[#1A1A1A] text-white flex justify-between items-center">
               <div className="flex items-center gap-3"><Cloud className="text-[#F6A028]" size={20} /><h2 className="text-lg font-black uppercase italic tracking-widest">CLOUD SYNC</h2></div>
               <button onClick={() => { setShowSyncModal(false); setSyncError(null); }} className="p-2 hover:bg-white/10 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-8 space-y-6">
               {sessionId ? (
                 <div className="space-y-6 text-center">
                    <div className="bg-gray-50 p-6 rounded-2xl border-2 border-gray-100">
                       <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">SESSION CODE</span>
                       <div className="text-xl font-black italic tracking-[0.1em] text-[#1A1A1A] uppercase break-all">{sessionId}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                       <button onClick={copyShareLink} className="py-4 bg-[#1A1A1A] text-white rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all"><LinkIcon size={14} /> Link</button>
                       <button onClick={leaveSession} className="py-4 bg-red-50 text-red-500 border-2 border-red-100 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Offline</button>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-6">
                    {syncError && <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600"><AlertTriangle size={20} /><div className="text-[10px] font-black uppercase leading-tight">Sync failed: {syncError}</div></div>}
                    <button onClick={createSession} disabled={isSyncing} className="w-full py-5 bg-[#1A1A1A] text-[#F6A028] rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] disabled:opacity-50 transition-all shadow-xl">
                       {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <Users size={18} />} 
                       {isSyncing ? 'Starting...' : 'Go Live (New Session)'}
                    </button>
                    <div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div><div className="relative flex justify-center text-[10px] font-black text-gray-300 uppercase bg-white px-2">OR JOIN SESSION</div></div>
                    <div className="space-y-3">
                       <input type="text" placeholder="PASTE SESSION ID" className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl font-black uppercase tracking-[0.1em] text-center outline-none focus:border-[#F6A028]" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
                       <button onClick={() => joinSession()} disabled={!joinCode || isSyncing} className="w-full py-5 bg-[#F6A028] text-black rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                          {isSyncing ? <Loader2 className="animate-spin" size={18} /> : null}
                          {isSyncing ? 'Connecting...' : 'Join Now'}
                       </button>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {showRegister && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl">
            <div className="p-6 bg-[#1A1A1A] text-white flex justify-between items-center border-b-[6px] border-[#F6A028]"><h2 className="text-xl font-black uppercase italic">{editingBeerId ? 'Update Entry' : 'New Entry'}</h2><button onClick={() => { setShowRegister(false); setEditingBeerId(null); }} className="p-2 bg-white/10 rounded-full"><X size={20}/></button></div>
            <div className="p-6 space-y-4">
              <div><label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block">BREWER NAME</label><input type="text" className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl font-black outline-none focus:border-[#F6A028]" value={newBeer.brewer} onChange={e => setNewBeer({...newBeer, brewer: e.target.value})} placeholder="e.g. John Smith" /></div>
              <div><label className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-1.5 block">BJCP STYLE</label><select className="w-full p-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl font-black outline-none focus:border-[#F6A028]" value={newBeer.style} onChange={e => setNewBeer({...newBeer, style: e.target.value})}><option value="">Select Style...</option>{allBJCPStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
              <button onClick={handleSaveBeer} className="w-full py-5 bg-[#1A1A1A] text-[#F6A028] font-black uppercase tracking-widest rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-xl">Confirm Entry</button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-[#1A1A1A] py-16 text-center border-t-8 border-[#F6A028] mt-auto">
        <div className="w-16 h-16 mx-auto opacity-20 mb-8" dangerouslySetInnerHTML={{ __html: LOGO_SVG }} />
        <div className="text-white/10 font-black uppercase tracking-[0.5em] italic text-[10px]">ORANGE COUNTY MASH UPS • SESSION SYNC v6.2</div>
      </footer>
    </div>
  );
};

export default App;
