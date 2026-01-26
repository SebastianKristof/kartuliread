
import React, { useState, useMemo } from 'react';
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
  // Queue for failed exercises to repeat at end of block
  const [failedQueue, setFailedQueue] = useState<Exercise[]>([]);
  const [isInRepetitionMode, setIsInRepetitionMode] = useState(false);
  const [repetitionIndex, setRepetitionIndex] = useState(0);

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

  // Determine current exercise - either from repetition queue or normal flow
  const currentExercise = useMemo(() => {
    if (isInRepetitionMode && failedQueue.length > 0) {
      return failedQueue[repetitionIndex] || null;
    }
    return levelExercises[successCount] || null;
  }, [levelExercises, successCount, isInRepetitionMode, failedQueue, repetitionIndex]);

  // Dynamic font sizing based on word length and level to prevent overflow
  // Higher levels (more letters) get smaller base sizes to fit width
  const fontSizeClass = useMemo(() => {
    if (!currentExercise) return "text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem]";
    const len = currentExercise.georgian.length;
    // Base sizes are larger, but scale down for higher levels (longer words)
    // Level 1-2: largest, Level 3-4: medium, Level 5-6: smaller to fit width
    
    if (len <= 3) {
      // Very short words - largest size
      return "text-7xl sm:text-8xl md:text-9xl lg:text-[10rem] xl:text-[12rem]";
    } else if (len <= 5) {
      // Short words
      return "text-6xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[10rem]";
    } else if (len <= 7) {
      // Medium words - scale by level
      if (currentLevel <= 2) {
        return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl";
      } else if (currentLevel <= 4) {
        return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
      } else {
        return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
      }
    } else {
      // Long words - scale significantly by level to fit width
      if (currentLevel <= 2) {
        return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl";
      } else if (currentLevel <= 4) {
        return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl";
      } else {
        return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl";
      }
    }
  }, [currentExercise, currentLevel]);

  const handleCorrect = () => {
    if (!currentExercise) return;

    if (isInRepetitionMode) {
      // In repetition mode - move to next failed exercise or exit repetition mode
      setRepetitionIndex(prev => {
        const nextRepIndex = prev + 1;
        setFailedQueue(currentQueue => {
          if (nextRepIndex >= currentQueue.length) {
            // Finished all repetitions - clear queue and exit repetition mode
            setIsInRepetitionMode(false);
            setShowTranscription(false);
            // Check if we need to start a new block
            if (successCount % BATCH_SIZE === 0 && successCount < SUCCESS_THRESHOLD) {
              alert(`Group complete! You've finished a group of 10.`);
            }
            return [];
          } else {
            setShowTranscription(false);
            return currentQueue;
          }
        });
        return nextRepIndex;
      });
      return;
    }

    // Normal mode - track history and progress
    setHistory(prev => {
        const alreadyExists = prev.find(h => h.id === currentExercise.id);
        if (alreadyExists) return prev;
        return [currentExercise, ...prev].slice(0, 20);
    });
    
    const nextCount = successCount + 1;
    setLevelProgress(prev => ({ ...prev, [currentLevel]: nextCount }));
    setShowTranscription(false);

    if (nextCount >= SUCCESS_THRESHOLD) {
      // Check for failed exercises before completing level
      setFailedQueue(currentQueue => {
        if (currentQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
        } else {
          alert(`Level ${currentLevel} mastered (50/50)! Excellent work.`);
        }
        return currentQueue;
      });
    } else if (nextCount % BATCH_SIZE === 0) {
      // Block complete - check if there are failed exercises to repeat
      setFailedQueue(currentQueue => {
        if (currentQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
          alert(`Group complete! Reviewing ${currentQueue.length} item(s) you couldn't read.`);
        } else {
          alert(`Group complete! You've finished a group of 10.`);
        }
        return currentQueue;
      });
    }
  };

  const handleCouldntRead = () => {
    if (!currentExercise) return;
    
    // Add to failed queue if not already there, then move to next exercise
    setFailedQueue(prev => {
      const alreadyExists = prev.find(f => f.id === currentExercise.id);
      const updatedQueue = alreadyExists ? prev : [...prev, currentExercise];
      
      // Move to next exercise (same as correct, but without tracking success)
      const nextCount = successCount + 1;
      setLevelProgress(levelPrev => ({ ...levelPrev, [currentLevel]: nextCount }));
      setShowTranscription(false);

      if (nextCount >= SUCCESS_THRESHOLD) {
        // If we finish the level, show any remaining failed exercises
        if (updatedQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
        } else {
          alert(`Level ${currentLevel} mastered (50/50)! Excellent work.`);
        }
      } else if (nextCount % BATCH_SIZE === 0) {
        // Block complete - check if there are failed exercises to repeat
        if (updatedQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
          alert(`Group complete! Reviewing ${updatedQueue.length} item(s) you couldn't read.`);
        } else {
          alert(`Group complete! You've finished a group of 10.`);
        }
      }
      
      return updatedQueue;
    });
  };

  const handleReveal = () => {
    setShowTranscription(true);
  };

  const handleLevelChange = (newLevel: number) => {
    if (newLevel === currentLevel) return;
    setCurrentLevel(newLevel);
    setShowTranscription(false);
    setFailedQueue([]);
    setIsInRepetitionMode(false);
    setRepetitionIndex(0);
  };

  const currentGroup = Math.floor(successCount / BATCH_SIZE) + 1;
  const groupProgress = successCount % BATCH_SIZE;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-2 sm:p-4 md:p-6 lg:p-8">
      <header className="w-full max-w-2xl mb-3 sm:mb-4 md:mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-900 mb-1 sm:mb-2">KartuliRead</h1>
        <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium tracking-tight">Mastering {currentLevel + 1}-letter combinations</p>
      </header>

      {/* Level Selector - Always accessible */}
      <div className="w-full max-w-2xl mb-4 sm:mb-6 md:mb-8 grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5">
        {[1, 2, 3, 4, 5, 6].map(l => (
          <button
            key={l}
            onClick={() => handleLevelChange(l)}
            className={`px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold transition-all border-2 flex flex-col items-center justify-center ${
              currentLevel === l 
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md scale-105 z-10' 
                : 'bg-white text-indigo-400 border-indigo-50 hover:border-indigo-200 shadow-sm'
            }`}
          >
            <span className="text-[8px] sm:text-[9px] uppercase opacity-70">Lvl</span>
            <span className="text-sm sm:text-base leading-none">{l}</span>
            <span className="text-[7px] sm:text-[8px] mt-0.5 opacity-60 font-black">{levelProgress[l]}/50</span>
          </button>
        ))}
      </div>

      <main className="w-full max-w-2xl bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-50 border-t-4 sm:border-t-8 border-t-indigo-500">
        {/* Progress Header */}
        <div className="bg-indigo-50/30 p-3 sm:p-4 md:p-6 border-b border-indigo-100">
          <div className="flex justify-between items-end mb-2 sm:mb-3 md:mb-4 px-1 sm:px-2">
            <div>
              <h2 className="text-indigo-900 font-black text-base sm:text-lg md:text-xl">Set Progress</h2>
              <p className="text-[9px] sm:text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em]">
                Group {Math.min(currentGroup, 5)} of 5 • Level {currentLevel}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-indigo-600">{groupProgress}</span>
              <span className="text-indigo-300 font-bold ml-1 text-sm sm:text-base">/ {BATCH_SIZE}</span>
            </div>
          </div>
          <ProgressBar current={groupProgress} total={BATCH_SIZE} />
          
          <div className="mt-2 sm:mt-3 md:mt-4 flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 sm:px-2">
            <span>Overall Level Mastery</span>
            <span>{successCount} / {SUCCESS_THRESHOLD}</span>
          </div>
        </div>

        {/* Exercise Area */}
        <div className="p-4 sm:p-6 md:p-8 lg:p-12 flex flex-col items-center min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[700px] justify-center relative bg-white">
          {currentExercise ? (
            <div className="w-full text-center space-y-4 sm:space-y-6 md:space-y-8 lg:space-y-12 animate-in fade-in zoom-in duration-500">
              <div className="flex flex-col items-center justify-center min-h-[200px] sm:min-h-[280px] md:min-h-[350px] lg:min-h-[400px] w-full px-2 sm:px-4">
                <span className={`georgian-text ${fontSizeClass} font-bold text-indigo-950 leading-tight select-none tracking-normal drop-shadow-sm break-words w-full overflow-wrap-anywhere`}>
                  {currentExercise.georgian}
                </span>
              </div>

              <div className="min-h-[80px] sm:min-h-[95px] md:min-h-[110px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-6 border border-slate-100">
                {showTranscription ? (
                  <div className="animate-in slide-in-from-bottom-2 duration-300 text-center space-y-1 sm:space-y-2">
                    <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-indigo-600 tracking-tighter uppercase">{currentExercise.transcription}</p>
                    {currentExercise.meaning && (
                      <p className="text-xs sm:text-sm text-slate-400 font-semibold italic">"{currentExercise.meaning}"</p>
                    )}
                  </div>
                ) : (
                  <button 
                    onClick={handleReveal}
                    className="text-slate-400 hover:text-indigo-600 font-black text-[9px] sm:text-[10px] tracking-[0.25em] uppercase py-3 sm:py-4 px-4 sm:px-8 border-2 border-dashed border-slate-200 rounded-xl sm:rounded-[2rem] transition-all hover:bg-white hover:border-indigo-200 group"
                  >
                    Tap to reveal transcription
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 w-full pt-2 sm:pt-3 md:pt-4">
                <button 
                  onClick={handleCouldntRead}
                  className="py-4 sm:py-5 md:py-6 px-3 sm:px-4 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black rounded-xl sm:rounded-[2rem] transition-all border-b-2 sm:border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 uppercase tracking-widest text-[10px] sm:text-xs"
                >
                  Couldn't Read
                </button>
                <button 
                  onClick={handleCorrect}
                  className="py-4 sm:py-5 md:py-6 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl sm:rounded-[2rem] transition-all border-b-2 sm:border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 shadow-xl uppercase tracking-widest text-[10px] sm:text-xs"
                >
                  I Read It!
                </button>
              </div>
              {isInRepetitionMode && (
                <div className="mt-2 sm:mt-3 text-center">
                  <span className="bg-amber-100 text-amber-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    Review: {repetitionIndex + 1} / {failedQueue.length}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-6 sm:p-8 md:p-12 animate-in zoom-in duration-500">
              <i className="fas fa-check-circle text-emerald-500 text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6"></i>
              <h3 className="text-xl sm:text-2xl font-black text-indigo-900 mb-2">Level Complete!</h3>
              <p className="text-sm sm:text-base text-slate-500 font-medium mb-6 sm:mb-8">You've mastered all 50 items in this level.</p>
              <button 
                onClick={() => handleLevelChange(currentLevel + 1 <= 6 ? currentLevel + 1 : 1)}
                className="bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-[2rem] font-black shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px] sm:text-xs"
              >
                Go to {currentLevel + 1 <= 6 ? `Level ${currentLevel + 1}` : "Level 1"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* History Grid */}
      <section className="w-full max-w-2xl mt-6 sm:mt-8 md:mt-12 mb-8 sm:mb-12 md:mb-16 px-2">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-black text-indigo-900 tracking-tight">Recent Progress</h2>
          <span className="bg-emerald-100 text-emerald-600 px-2 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
            {history.length} Session Recent
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
          {history.map((h, i) => (
            <div key={`${h.id}-${i}`} className="bg-white p-2 sm:p-3 md:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 text-center animate-in slide-in-from-bottom-2 duration-300 hover:border-indigo-200 transition-colors cursor-default overflow-hidden">
              <p className="georgian-text text-lg sm:text-xl font-bold text-indigo-950 leading-tight truncate">{h.georgian}</p>
              <p className="text-[8px] sm:text-[9px] text-slate-300 font-black uppercase mt-0.5 sm:mt-1 tracking-tighter truncate">{h.transcription}</p>
            </div>
          ))}
          {history.length === 0 && (
            <div className="col-span-full py-8 sm:py-12 md:py-16 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-[9px] sm:text-[10px] border-2 sm:border-4 border-dotted border-slate-100 rounded-2xl sm:rounded-[3rem]">
              Successes will appear here
            </div>
          )}
        </div>
      </section>

      <footer className="w-full max-w-2xl text-center border-t border-slate-200 py-6 sm:py-8 md:py-10 opacity-50">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1 sm:mb-2">KartuliRead System</p>
        <p className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest">50 Items Per Level • Group Shuffle Active</p>
      </footer>
    </div>
  );
};

export default App;
