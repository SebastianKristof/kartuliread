
import React, { useState, useMemo, useLayoutEffect, useRef } from 'react';
import { Exercise, SUCCESS_THRESHOLD, BATCH_SIZE } from './types';
import { ProgressBar } from './components/ProgressBar';
import { EXERCISES_DATA } from './data/exercisesData';

const App: React.FC = () => {
  // Global progress across levels
  const [levelProgress, setLevelProgress] = useState<{ [key: number]: number }>({
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0
  });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [showTranscription, setShowTranscription] = useState(false);
  const [history, setHistory] = useState<Exercise[]>([]);
  const [fitFontPx, setFitFontPx] = useState(96);
  const georgianContainerRef = useRef<HTMLDivElement | null>(null);
  const georgianTextRef = useRef<HTMLSpanElement | null>(null);

  // Current level total progress
  const successCount = levelProgress[currentLevel] || 0;
  
  // Helper to shuffle a subset of an array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Exercises for the current level, shuffled in blocks of 10
  const levelExercises = useMemo(() => {
    const raw = EXERCISES_DATA[currentLevel] || [];
    const processed: Exercise[] = [];
    
    // Process in chunks of 10 to keep the general difficulty curve 
    // but randomize within the group
    for (let i = 0; i < raw.length; i += BATCH_SIZE) {
      const chunk = raw.slice(i, i + BATCH_SIZE);
      processed.push(...shuffleArray(chunk));
    }
    
    return processed;
  }, [currentLevel]);

  // Current item based on total success in this level
  const currentExercise = useMemo(() => levelExercises[successCount] || null, [levelExercises, successCount]);

  useLayoutEffect(() => {
    if (!currentExercise) return;
    const container = georgianContainerRef.current;
    const text = georgianTextRef.current;
    if (!container || !text) return;

    const computeFitFont = () => {
      const paddingRatio = 0.1;
      const availableWidth = container.clientWidth * (1 - paddingRatio * 2);
      const availableHeight = container.clientHeight * (1 - paddingRatio * 2);
      if (availableWidth <= 0 || availableHeight <= 0) return;

      let low = 12;
      let high = Math.max(12, Math.floor(availableHeight));
      let best = low;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        text.style.fontSize = `${mid}px`;
        const fits = text.scrollWidth <= availableWidth && text.scrollHeight <= availableHeight;
        if (fits) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      setFitFontPx(prev => (prev === best ? prev : best));
    };

    computeFitFont();
    const observer = new ResizeObserver(() => computeFitFont());
    observer.observe(container);

    return () => observer.disconnect();
  }, [currentExercise]);

  const handleCorrect = () => {
    if (!currentExercise) return;

    // Track history (only unique items per session)
    setHistory(prev => {
        const alreadyExists = prev.find(h => h.id === currentExercise.id);
        if (alreadyExists) return prev;
        return [currentExercise, ...prev].slice(0, 20);
    });
    
    const nextCount = successCount + 1;
    setLevelProgress(prev => ({ ...prev, [currentLevel]: nextCount }));
    setShowTranscription(false);

    if (nextCount >= SUCCESS_THRESHOLD) {
      alert(`Level ${currentLevel} mastered (50/50)! Excellent work.`);
    } else if (nextCount % BATCH_SIZE === 0) {
      alert(`Group complete! You've finished a group of 10.`);
    }
  };

  const handleReveal = () => {
    setShowTranscription(true);
  };

  const handleLevelChange = (newLevel: number) => {
    if (newLevel === currentLevel) return;
    setCurrentLevel(newLevel);
    setShowTranscription(false);
  };

  const currentGroup = Math.floor(successCount / BATCH_SIZE) + 1;
  const groupProgress = successCount % BATCH_SIZE;

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-slate-50 flex flex-col items-center p-4 md:p-6">
      <header className="w-full max-w-2xl mb-6 md:mb-4 text-center">
        <h1 className="text-4xl font-extrabold text-indigo-900 mb-2">KartuliRead</h1>
        <p className="text-slate-500 font-medium tracking-tight">Mastering {currentLevel + 1}-letter combinations</p>
      </header>

      <div className="w-full max-w-6xl md:flex-1 md:grid md:grid-cols-[220px_minmax(0,1fr)_260px] md:gap-6">
        {/* Level Selector - Left on desktop */}
        <div className="w-full max-w-2xl md:max-w-none mb-8 md:mb-0">
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5, 6].map(l => (
              <button
                key={l}
                onClick={() => handleLevelChange(l)}
                className={`px-2 py-3 rounded-2xl font-bold transition-all border-2 flex flex-col items-center justify-center ${
                  currentLevel === l 
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg scale-105 z-10' 
                    : 'bg-white text-indigo-400 border-indigo-50 hover:border-indigo-200 shadow-sm'
                }`}
              >
                <span className="text-[10px] uppercase opacity-70">Lvl</span>
                <span className="text-lg leading-none">{l}</span>
                <span className="text-[8px] mt-1 opacity-60 font-black">{levelProgress[l]}/50</span>
              </button>
            ))}
          </div>
        </div>

        <main className="w-full max-w-2xl md:max-w-xl md:scale-[0.95] md:origin-top bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-50 border-t-8 border-t-indigo-500">
          {/* Progress Header */}
          <div className="bg-indigo-50/30 p-6 md:p-4 border-b border-indigo-100">
            <div className="flex justify-between items-end mb-4 px-2">
              <div>
                <h2 className="text-indigo-900 font-black text-xl">Set Progress</h2>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">
                  Group {Math.min(currentGroup, 5)} of 5 • Level {currentLevel}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-indigo-600">{groupProgress}</span>
                <span className="text-indigo-300 font-bold ml-1">/ {BATCH_SIZE}</span>
              </div>
            </div>
            <ProgressBar current={groupProgress} total={BATCH_SIZE} />
            
            <div className="mt-4 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
              <span>Overall Level Mastery</span>
              <span>{successCount} / {SUCCESS_THRESHOLD}</span>
            </div>
          </div>

          {/* Exercise Area */}
          <div className="p-8 md:p-6 flex flex-col items-center min-h-[450px] md:min-h-[360px] justify-center relative bg-white">
            {currentExercise ? (
              <div className="w-full text-center space-y-12 md:space-y-6 animate-in fade-in zoom-in duration-500">
                <div ref={georgianContainerRef} className="flex flex-col items-center justify-center min-h-[160px] md:min-h-[130px] w-full">
                  <span
                    ref={georgianTextRef}
                    style={{ fontSize: `${fitFontPx}px` }}
                    className="georgian-text inline-block max-w-full font-bold text-indigo-950 leading-none select-none tracking-normal drop-shadow-sm whitespace-nowrap"
                  >
                    {currentExercise.georgian}
                  </span>
                </div>

                <div className="min-h-[110px] md:min-h-[90px] flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl p-6 md:p-4 border border-slate-100">
                  {showTranscription ? (
                    <div className="animate-in slide-in-from-bottom-2 duration-300 text-center space-y-2">
                      <p className="text-4xl md:text-5xl font-black text-indigo-600 tracking-tighter uppercase">{currentExercise.transcription}</p>
                      {currentExercise.meaning && (
                        <p className="text-sm text-slate-400 font-semibold italic">"{currentExercise.meaning}"</p>
                      )}
                    </div>
                  ) : (
                    <button 
                      onClick={handleReveal}
                      className="text-slate-400 hover:text-indigo-600 font-black text-[10px] tracking-[0.25em] uppercase py-4 px-8 border-2 border-dashed border-slate-200 rounded-[2rem] transition-all hover:bg-white hover:border-indigo-200 group"
                    >
                      Tap to reveal transcription
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6 md:gap-4 w-full pt-4 md:pt-2">
                  <button 
                    onClick={handleReveal}
                    className="py-6 px-4 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black rounded-[2rem] transition-all border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 uppercase tracking-widest text-xs"
                  >
                    Need Help
                  </button>
                  <button 
                    onClick={handleCorrect}
                    className="py-6 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[2rem] transition-all border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 shadow-xl uppercase tracking-widest text-xs"
                  >
                    I Read It!
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center p-12 animate-in zoom-in duration-500">
                <i className="fas fa-check-circle text-emerald-500 text-6xl mb-6"></i>
                <h3 className="text-2xl font-black text-indigo-900 mb-2">Level Complete!</h3>
                <p className="text-slate-500 font-medium mb-8">You've mastered all 50 items in this level.</p>
                <button 
                  onClick={() => handleLevelChange(currentLevel + 1 <= 6 ? currentLevel + 1 : 1)}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-[2rem] font-black shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-xs"
                >
                  Go to {currentLevel + 1 <= 6 ? `Level ${currentLevel + 1}` : "Level 1"}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* History Grid - Right on desktop */}
        <section className="w-full max-w-2xl md:max-w-none mt-12 mb-16 md:mt-0 md:mb-0 px-2 md:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-indigo-900 tracking-tight">Recent Progress</h2>
            <span className="bg-emerald-100 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
              {history.length} Session Recent
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {history.map((h, i) => (
              <div key={`${h.id}-${i}`} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center animate-in slide-in-from-bottom-2 duration-300 hover:border-indigo-200 transition-colors cursor-default overflow-hidden">
                <p className="georgian-text text-xl font-bold text-indigo-950 leading-tight truncate">{h.georgian}</p>
                <p className="text-[9px] text-slate-300 font-black uppercase mt-1 tracking-tighter truncate">{h.transcription}</p>
              </div>
            ))}
            {history.length === 0 && (
              <div className="col-span-2 py-16 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[10px] border-4 border-dotted border-slate-100 rounded-[3rem]">
                Successes will appear here
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="w-full max-w-2xl text-center border-t border-slate-200 py-10 opacity-50">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">KartuliRead System</p>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">50 Items Per Level • Group Shuffle Active</p>
      </footer>
    </div>
  );
};

export default App;
