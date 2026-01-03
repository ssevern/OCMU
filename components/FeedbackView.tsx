
import React, { useState, useEffect } from 'react';
import { TastingBeer, BeerFeedback, BJCPStyleData } from '../types';
import { Beer, Send, ChevronLeft, User, Star, AlertCircle, Loader2, BookOpen, Info, X, Zap, CheckCircle2, Minus, Plus } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { DESCRIPTOR_GROUPS } from '../constants';

interface FeedbackViewProps {
  beer: TastingBeer;
  onSubmit: (feedback: Omit<BeerFeedback, 'id' | 'timestamp'>) => void;
  onClose: () => void;
}

export const FeedbackView: React.FC<FeedbackViewProps> = ({ beer, onSubmit, onClose }) => {
  const [judgeName, setJudgeName] = useState('');
  
  // Starting at 35 total (Excellent range)
  const [scores, setScores] = useState({
    aroma: 8,
    appearance: 2,
    flavor: 14,
    mouthfeel: 4,
    overall: 7
  });
  
  const [selectedDescriptors, setSelectedDescriptors] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showInlineTips, setShowInlineTips] = useState(true);
  const [loadingGuidelines, setLoadingGuidelines] = useState(false);
  const [guidelines, setGuidelines] = useState<BJCPStyleData | null>(null);

  useEffect(() => {
    const fetchGuidelines = async () => {
      setLoadingGuidelines(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Provide the official BJCP style guidelines for the beer style: "${beer.style}". 
          Format the response as a JSON object with these keys: 
          category, overallImpression, aroma, appearance, flavor, mouthfeel. 
          Keep descriptions VERY CONCISE (max 150 characters each) for inline mobile tips.`,
          config: {
            responseMimeType: "application/json"
          }
        });
        
        const data = JSON.parse(response.text || '{}');
        setGuidelines(data);
      } catch (e) {
        console.error("AI Guidelines fetch failed", e);
      } finally {
        setLoadingGuidelines(false);
      }
    };

    fetchGuidelines();
  }, [beer.style]);

  const totalScore = scores.aroma + scores.appearance + scores.flavor + scores.mouthfeel + scores.overall;

  const toggleDescriptor = (d: string) => {
    setSelectedDescriptors(prev => 
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!judgeName) { 
      alert("Please enter a Judge Name first."); 
      const el = document.getElementById('judge-name-input');
      el?.scrollIntoView({ behavior: 'smooth' });
      return; 
    }
    onSubmit({
      beerId: beer.id,
      brewerName: beer.brewer,
      judgeName: judgeName,
      aroma: scores.aroma,
      appearance: scores.appearance,
      flavor: scores.flavor,
      mouthfeel: scores.mouthfeel,
      overall: scores.overall,
      descriptors: selectedDescriptors,
      notes: notes
    });
    onClose();
  };

  const ScoreSlider = ({ label, max, val, setVal, tip }: any) => {
    const getTicks = () => {
      if (max <= 5) return Array.from({ length: max + 1 }, (_, i) => i);
      if (max === 10) return [0, 2, 4, 6, 8, 10];
      if (max === 12) return [0, 3, 6, 9, 12];
      if (max === 20) return [0, 5, 10, 15, 20];
      return [0, Math.floor(max / 2), max];
    };

    const ticks = getTicks();
    const increment = () => setVal(Math.min(max, val + 1));
    const decrement = () => setVal(Math.max(0, val - 1));

    return (
      <div className="bg-white p-5 md:p-6 rounded-[32px] shadow-sm border-2 border-gray-100 mb-4 transition-all">
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <label className="font-black uppercase text-[10px] tracking-widest text-gray-400 leading-none mb-1">{label}</label>
            <span className="text-[9px] font-bold text-gray-300 uppercase italic">Scale: 0 - {max}</span>
          </div>
          <div className="flex flex-col items-end">
             <span className="font-black text-3xl text-[#1A1A1A] italic tracking-tighter leading-none">{val}</span>
             <span className="text-[7px] font-black text-[#F6A028] uppercase tracking-widest">Points</span>
          </div>
        </div>
        
        {showInlineTips && tip && (
          <div className="mb-6 bg-[#F6A028]/5 border-l-4 border-[#F6A028] p-3 rounded-r-xl animate-in fade-in slide-in-from-left-2 duration-300">
            <p className="text-[10px] md:text-xs font-slab font-bold text-[#1A1A1A]/70 leading-relaxed italic">"{tip}"</p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={decrement}
            className="w-12 h-12 shrink-0 bg-gray-50 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#1A1A1A] active:scale-90 transition-all"
          >
            <Minus size={20} />
          </button>

          <div className="flex-grow relative flex flex-col items-center">
            <input 
              type="range" min="0" max={max} value={val} 
              onChange={(e) => setVal(parseInt(e.target.value))}
              className="w-full h-4 bg-gray-100 rounded-full appearance-none cursor-pointer accent-[#F6A028] touch-pan-x"
            />
            <div className="w-full flex justify-between mt-4 pointer-events-none px-1">
              {ticks.map(t => (
                <span key={t} className="text-[9px] font-black text-gray-300 uppercase italic tracking-tighter">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <button 
            type="button"
            onClick={increment}
            className="w-12 h-12 shrink-0 bg-gray-50 border-2 border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-[#1A1A1A] active:scale-90 transition-all"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>
    );
  };

  const SensorySection = ({ title, keys }: { title: string, keys: string[] }) => (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-gray-100 mb-4">
      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">{title}</label>
      <div className="flex flex-wrap gap-2">
        {keys.map(d => (
          <button 
            key={d} type="button" 
            onClick={() => toggleDescriptor(d)} 
            className={`px-3 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${selectedDescriptors.includes(d) ? 'bg-[#F6A028] text-black border-[#F6A028] shadow-md scale-105' : 'bg-gray-50 text-gray-400 border-gray-100 active:scale-95'}`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1000] bg-[#F3F4F6] flex flex-col overflow-hidden">
      <header className="bg-[#1A1A1A] p-4 md:p-6 sticky top-0 z-50 border-b-8 border-[#F6A028] flex items-center justify-between text-white shadow-2xl">
        <button onClick={onClose} className="p-2 md:p-3 hover:bg-white/10 rounded-2xl transition-all"><ChevronLeft size={24} /></button>
        <div className="text-center overflow-hidden px-2 flex-grow">
          <h2 className="font-black uppercase tracking-tight text-[11px] md:text-sm italic leading-tight">ORANGE COUNTY MASH UPS</h2>
          <div className="flex items-center justify-center gap-1 mt-0.5">
             <div className={`w-1.5 h-1.5 rounded-full ${loadingGuidelines ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
             <span className="text-[7px] md:text-[8px] font-bold text-[#F6A028] uppercase tracking-widest truncate max-w-[150px]">{beer.style}</span>
          </div>
        </div>
        <button 
          onClick={() => setShowInlineTips(!showInlineTips)}
          className={`p-2 px-3 md:p-3 md:px-4 rounded-2xl transition-all flex items-center gap-2 border-2 ${showInlineTips ? 'bg-[#F6A028] border-[#F6A028] text-black' : 'bg-transparent border-white/20 text-white/50'}`}
        >
          <Zap size={16} fill={showInlineTips ? "currentColor" : "none"} /> 
          <span className="hidden sm:inline font-black uppercase text-[10px] tracking-widest">{showInlineTips ? 'Coach ON' : 'Coach OFF'}</span>
        </button>
      </header>

      <div className="flex-grow overflow-y-auto scrolling-touch">
        <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto w-full pb-32">
          <div className="bg-[#1A1A1A] text-white p-8 md:p-10 rounded-[40px] md:rounded-[60px] shadow-2xl relative overflow-hidden border-b-[12px] md:border-b-[16px] border-[#F6A028]">
            <div className="relative z-10">
              <span className="bg-[#F6A028] text-black px-2 py-0.5 rounded-md font-black uppercase text-[8px] md:text-[10px] tracking-widest mb-3 inline-block">FLIGHT ENTRY</span>
              <h3 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter leading-none mb-3">{beer.style}</h3>
              <p className="text-white/60 font-bold uppercase text-[10px] md:text-xs tracking-[0.2em]">BREWER: {beer.brewer}</p>
              {showInlineTips && guidelines && (
                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 animate-in zoom-in-95 duration-500">
                  <h4 className="text-[#F6A028] font-black uppercase text-[8px] tracking-[0.2em] mb-2 flex items-center gap-2"><Info size={12} /> Style Profile</h4>
                  <p className="text-[10px] md:text-xs font-slab text-white/80 leading-relaxed italic">{guidelines.overallImpression}</p>
                </div>
              )}
            </div>
            <Beer className="absolute -bottom-10 -right-10 w-48 md:w-72 h-48 md:h-72 text-white opacity-5" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div id="judge-name-input" className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-gray-100">
               <label className="flex items-center gap-3 text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3"><User size={14} /> JUDGE NAME</label>
               <input 
                 type="text" 
                 placeholder="Enter Name" 
                 className="w-full p-4 bg-gray-50 border-4 border-transparent focus:border-[#F6A028] rounded-2xl outline-none font-black uppercase transition-all" 
                 value={judgeName} 
                 onChange={e => setJudgeName(e.target.value)} 
               />
            </div>

            <div className="space-y-2">
              <ScoreSlider label="Aroma" max={12} val={scores.aroma} setVal={(v: number) => setScores({...scores, aroma: v})} tip={guidelines?.aroma} />
              <ScoreSlider label="Appearance" max={3} val={scores.appearance} setVal={(v: number) => setScores({...scores, appearance: v})} tip={guidelines?.appearance} />
              <ScoreSlider label="Flavor" max={20} val={scores.flavor} setVal={(v: number) => setScores({...scores, flavor: v})} tip={guidelines?.flavor} />
              <ScoreSlider label="Mouthfeel" max={5} val={scores.mouthfeel} setVal={(v: number) => setScores({...scores, mouthfeel: v})} tip={guidelines?.mouthfeel} />
              <ScoreSlider label="Overall" max={10} val={scores.overall} setVal={(v: number) => setScores({...scores, overall: v})} tip="Assess drinkability and style fidelity." />
            </div>

            <div className="bg-[#1A1A1A] p-8 md:p-10 rounded-[40px] md:rounded-[48px] text-center shadow-2xl border-t-[12px] border-[#F6A028]">
               <div className="text-[80px] md:text-[100px] font-black text-white leading-none mb-1 tracking-tighter drop-shadow-[0_4px_0_rgba(246,160,40,1)]">{totalScore}</div>
               <div className="text-[#F6A028] font-black uppercase text-[10px] tracking-[0.4em] italic">TOTAL SCORE</div>
            </div>

            <div className="space-y-2">
               <SensorySection title="Malt Profile" keys={DESCRIPTOR_GROUPS.MALT} />
               <SensorySection title="Hop Profile" keys={DESCRIPTOR_GROUPS.HOPS} />
               <SensorySection title="Yeast & Fermentation" keys={DESCRIPTOR_GROUPS.YEAST} />
               <SensorySection title="Off-Flavors / Faults" keys={DESCRIPTOR_GROUPS.OFF_FLAVORS} />
            </div>

            <div className="bg-white p-6 rounded-[32px] shadow-sm border-2 border-gray-100">
               <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">NOTES FOR BREWER</label>
               <textarea 
                 placeholder="Be constructive, specific, and kind..." 
                 className="w-full p-4 bg-gray-50 border-4 border-transparent focus:border-[#F6A028] rounded-2xl outline-none font-slab font-bold text-sm h-32 resize-none transition-all" 
                 value={notes} 
                 onChange={e => setNotes(e.target.value)} 
               />
            </div>

            <button 
              type="submit" 
              className="w-full py-6 md:py-8 bg-[#F6A028] text-[#1A1A1A] font-black uppercase tracking-[0.3em] text-lg md:text-xl rounded-[32px] md:rounded-[40px] shadow-2xl flex items-center justify-center gap-4 hover:brightness-110 active:scale-95 transition-all"
            >
              <CheckCircle2 size={24} /> CAST SCORECARD
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
