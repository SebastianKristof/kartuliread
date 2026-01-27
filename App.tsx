
import React, { useState, useMemo, useEffect } from 'react';
import { Exercise, SUCCESS_THRESHOLD, BATCH_SIZE } from './types';
import { ProgressBar } from './components/ProgressBar';
import { EXERCISES_DATA } from './data/exercisesData';

const STORAGE_KEY = 'kartuliread_progress';
const STORAGE_LEVEL_KEY = 'kartuliread_current_level';

// Load progress from localStorage
const loadProgress = (): { [key: number]: number } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure all 8 levels exist
      const progress: { [key: number]: number } = {};
      for (let i = 1; i <= 8; i++) {
        progress[i] = parsed[i] || 0;
      }
      return progress;
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
};

// Save progress to localStorage
const saveProgress = (progress: { [key: number]: number }) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
};

// Load current level from localStorage
const loadCurrentLevel = (): number => {
  try {
    const saved = localStorage.getItem(STORAGE_LEVEL_KEY);
    if (saved) {
      const level = parseInt(saved, 10);
      if (level >= 1 && level <= 8) return level;
    }
  } catch (e) {
    console.error('Failed to load current level:', e);
  }
  return 1;
};

// Save current level to localStorage
const saveCurrentLevel = (level: number) => {
  try {
    localStorage.setItem(STORAGE_LEVEL_KEY, level.toString());
  } catch (e) {
    console.error('Failed to save current level:', e);
  }
};

const App: React.FC = () => {
  // Global progress across levels - load from localStorage on mount
  const [levelProgress, setLevelProgress] = useState<{ [key: number]: number }>(() => loadProgress());
  const [currentLevel, setCurrentLevel] = useState(() => loadCurrentLevel());
  const [showTranscription, setShowTranscription] = useState(false);
  const [successfulHistory, setSuccessfulHistory] = useState<Exercise[]>([]);
  const [unsuccessfulHistory, setUnsuccessfulHistory] = useState<Exercise[]>([]);
  // Queue for failed exercises to repeat at end of block
  const [failedQueue, setFailedQueue] = useState<Exercise[]>([]);
  const [isInRepetitionMode, setIsInRepetitionMode] = useState(false);
  const [repetitionIndex, setRepetitionIndex] = useState(0);
  const [repetitionContext, setRepetitionContext] = useState<'chunk' | 'level' | null>(null);
  // Modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [congratulationsMessage, setCongratulationsMessage] = useState<string | null>(null);

  // Save progress to localStorage whenever it changes
  useEffect(() => {
    saveProgress(levelProgress);
  }, [levelProgress]);

  // Save current level to localStorage whenever it changes
  useEffect(() => {
    saveCurrentLevel(currentLevel);
  }, [currentLevel]);

  // Current level total progress
  const successCount = levelProgress[currentLevel] || 0;
  const isLevelMastered = successCount >= SUCCESS_THRESHOLD;

  // Helper to shuffle a subset of an array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Exercises for the current level, shuffled in blocks of 10.
  // Enforce that each word length matches the current level if possible, but fallback if not enough.
  const levelExercises = useMemo(() => {
    const allForLevel = EXERCISES_DATA[currentLevel] || [];
    // Prioritize exact length matches
    let levelSpecific = allForLevel.filter(ex => [...ex.georgian].length === currentLevel);

    // If we don't have enough exact matches (e.g. at higher levels), mix in others or repeat
    if (levelSpecific.length < 5) { // Arbitrary low threshold
      levelSpecific = allForLevel;
    }

    // Ensure we have at least SUCCESS_THRESHOLD items by repeating if necessary
    const pool = [...levelSpecific];
    while (pool.length < SUCCESS_THRESHOLD) {
      pool.push(...levelSpecific);
    }

    // Shuffle and slice to exact count needed
    const processed: Exercise[] = [];

    // Process in chunks of 10 to keep the general difficulty curve 
    // but randomize within the group. We only need up to SUCCESS_THRESHOLD.
    const needed = Math.max(pool.length, SUCCESS_THRESHOLD);
    const source = pool.slice(0, needed); // Ensure we have enough

    for (let i = 0; i < SUCCESS_THRESHOLD; i += BATCH_SIZE) {
      // Loop around source if needed (safe due to while loop above, but good practice)
      const chunk = source.slice(i, i + BATCH_SIZE);
      // If chunk is partial, fill it from start
      if (chunk.length < BATCH_SIZE) {
        chunk.push(...source.slice(0, BATCH_SIZE - chunk.length));
      }
      processed.push(...shuffleArray(chunk));
    }

    return processed.slice(0, SUCCESS_THRESHOLD);
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
      // Very short words - balanced for desktop
      return "text-6xl sm:text-7xl md:text-8xl lg:text-9xl";
    } else if (len <= 5) {
      // Short words
      return "text-5xl sm:text-6xl md:text-7xl lg:text-8xl";
    } else if (len <= 7) {
      // Medium words - scale by level
      if (currentLevel <= 2) {
        return "text-4xl sm:text-5xl md:text-6xl lg:text-7xl";
      } else if (currentLevel <= 4) {
        return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
      } else {
        return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
      }
    } else {
      // Long words - scale significantly
      if (currentLevel <= 2) {
        return "text-3xl sm:text-4xl md:text-5xl lg:text-6xl";
      } else if (currentLevel <= 4) {
        return "text-2xl sm:text-3xl md:text-4xl lg:text-5xl";
      } else {
        return "text-xl sm:text-2xl md:text-3xl lg:text-4xl";
      }
    }
  }, [currentExercise, currentLevel]);

  const handleCorrect = () => {
    if (!currentExercise) return;

    if (isInRepetitionMode) {
      // In repetition mode - move item from unsuccessful to successful
      setUnsuccessfulHistory(prev => prev.filter(h => h.id !== currentExercise.id));
      setSuccessfulHistory(prev => {
        const alreadyExists = prev.find(h => h.id === currentExercise.id);
        if (alreadyExists) return prev;
        return [currentExercise, ...prev].slice(0, 20);
      });

      // Move to next failed exercise or exit repetition mode
      setRepetitionIndex(prev => {
        const nextRepIndex = prev + 1;
        setFailedQueue(currentQueue => {
          if (nextRepIndex >= currentQueue.length) {
            // Finished all repetitions - clear queue and exit repetition mode
            // Show congratulations after review is done, based on context
            if (repetitionContext === 'chunk') {
              setCongratulationsMessage('Group complete!\nYou have finished this group of 10, including review.');
            } else if (repetitionContext === 'level') {
              setCongratulationsMessage(`Level ${currentLevel} mastered!\nYou have completed all items in this level, including review.`);
            }
            setRepetitionContext(null);
            setIsInRepetitionMode(false);
            setShowTranscription(false);
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
    setSuccessfulHistory(prev => {
      const alreadyExists = prev.find(h => h.id === currentExercise.id);
      if (alreadyExists) return prev;
      return [currentExercise, ...prev].slice(0, 20);
    });

    const nextCount = successCount + 1;
    setLevelProgress(prev => ({ ...prev, [currentLevel]: nextCount }));
    setShowTranscription(false);

    if (nextCount >= SUCCESS_THRESHOLD) {
      // Level complete - clear history for review/next level
      setSuccessfulHistory([]);
      setUnsuccessfulHistory([]);

      // If there are failed items, go into level review first; congratulate after review.
      setFailedQueue(currentQueue => {
        if (currentQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
          setRepetitionContext('level');
        } else {
          setCongratulationsMessage(`Level ${currentLevel} mastered!\nYou have completed all items in this level.`);
        }
        return currentQueue;
      });
    } else if (nextCount % BATCH_SIZE === 0) {
      // Chunk complete in normal mode.
      // Clear history for new chunk and show congratulations
      setSuccessfulHistory([]);
      setUnsuccessfulHistory([]);

      setFailedQueue(currentQueue => {
        if (currentQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
          setRepetitionContext('chunk');
        } else {
          setCongratulationsMessage('Group complete!\nYou have finished this group of 10.');
        }
        return currentQueue;
      });
    }
  };

  const handleCouldntRead = () => {
    if (!currentExercise) return;

    // Add to unsuccessful history
    setUnsuccessfulHistory(prev => {
      const alreadyExists = prev.find(h => h.id === currentExercise.id);
      if (alreadyExists) return prev;
      return [currentExercise, ...prev].slice(0, 20);
    });

    // Add to failed queue if not already there, then move to next exercise
    setFailedQueue(prev => {
      const alreadyExists = prev.find(f => f.id === currentExercise.id);
      const updatedQueue = alreadyExists ? prev : [...prev, currentExercise];

      // Move to next exercise (same as correct, but without tracking success)
      const nextCount = successCount + 1;
      setLevelProgress(levelPrev => ({ ...levelPrev, [currentLevel]: nextCount }));
      setShowTranscription(false);

      if (nextCount >= SUCCESS_THRESHOLD) {
        // Level complete - clear history for review/next level
        setSuccessfulHistory([]);
        setUnsuccessfulHistory([]);

        // If we finish the level, show any remaining failed exercises
        if (updatedQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
          setRepetitionContext('level');
        }
      } else if (nextCount % BATCH_SIZE === 0) {
        // Block complete - clear history for new chunk
        setSuccessfulHistory([]);
        setUnsuccessfulHistory([]);

        // Check if there are failed exercises to repeat
        if (updatedQueue.length > 0) {
          setIsInRepetitionMode(true);
          setRepetitionIndex(0);
          setRepetitionContext('chunk');
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
    setSuccessfulHistory([]);
    setUnsuccessfulHistory([]);
  };

  const handleSetChange = (setNum: number) => {
    const newProgress = (setNum - 1) * BATCH_SIZE;
    setLevelProgress(prev => ({ ...prev, [currentLevel]: newProgress }));
    setSuccessfulHistory([]);
    setUnsuccessfulHistory([]);
    setFailedQueue([]);
    setIsInRepetitionMode(false);
    setRepetitionIndex(0);
    setShowTranscription(false);
  };

  const handleResetLevel = () => {
    setShowResetModal(true);
  };

  const confirmResetLevel = () => {
    setLevelProgress(prev => ({ ...prev, [currentLevel]: 0 }));
    setShowTranscription(false);
    setFailedQueue([]);
    setIsInRepetitionMode(false);
    setRepetitionIndex(0);
    setSuccessfulHistory([]);
    setUnsuccessfulHistory([]);
    setShowResetModal(false);
  };

  const currentGroup = Math.floor(successCount / BATCH_SIZE) + 1;
  const groupProgress = successCount % BATCH_SIZE;

  // Auto-dismiss congratulations messages
  useEffect(() => {
    if (congratulationsMessage) {
      // Shorter timeout for non-level-complete messages (toasts)
      const isLevelComplete = congratulationsMessage.includes('mastered');
      const timeout = isLevelComplete ? 5000 : 2000;

      const timer = setTimeout(() => {
        setCongratulationsMessage(null);
      }, timeout);
      return () => clearTimeout(timer);
    }
  }, [congratulationsMessage]);

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center p-2 sm:p-3 md:p-4 lg:p-5">
      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border-4 border-indigo-100 animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto bg-indigo-50 rounded-full flex items-center justify-center">
                  <i className="fas fa-undo text-indigo-500 text-3xl"></i>
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-indigo-900 mb-2">Restart Level {currentLevel}?</h3>
              <p className="text-sm sm:text-base text-slate-500 mb-6">Want to start this level from the beginning? This will clear your current progress.</p>
              <div className="flex gap-3 sm:gap-4 justify-center">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-black transition-all uppercase tracking-widest text-xs sm:text-sm"
                >
                  Go Back
                </button>
                <button
                  onClick={confirmResetLevel}
                  className="px-6 sm:px-8 py-2 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black transition-all uppercase tracking-widest text-xs sm:text-sm shadow-lg shadow-indigo-100"
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Congratulations Toast/Modal */}
      {congratulationsMessage && (
        congratulationsMessage.includes('mastered') ? (
          // Level Complete Modal (Center)
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border-4 border-emerald-500 animate-in zoom-in duration-300">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-trophy text-emerald-600 text-3xl"></i>
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-indigo-900 mb-3 whitespace-pre-line">{congratulationsMessage}</h3>
                <button
                  onClick={() => setCongratulationsMessage(null)}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-black transition-all uppercase tracking-widest text-xs sm:text-sm"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Chunk Complete Toast (Top)
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 border-2 border-emerald-400">
              <i className="fas fa-check-circle text-white text-lg"></i>
              <span className="font-bold text-sm sm:text-base whitespace-nowrap">{congratulationsMessage.split('\n')[0]}</span>
            </div>
          </div>
        )
      )}
      <header className="w-full max-w-5xl mb-2 sm:mb-4 md:mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-900">KartuliRead</h1>
      </header>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-start justify-center gap-4 lg:gap-6 px-2 sm:px-4">
        {/* Left Sidebar: Level Selector */}
        <div className="w-full lg:w-24 grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-1 gap-1.5 order-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
            <button
              key={l}
              onClick={() => handleLevelChange(l)}
              className={`px-1 sm:px-2 py-1.5 sm:py-2 rounded-lg sm:rounded-xl font-bold transition-all border-2 flex flex-col items-center justify-center ${currentLevel === l
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md lg:scale-105 z-10'
                : 'bg-white text-indigo-400 border-indigo-50 hover:border-indigo-200 shadow-sm'
                }`}
            >
              <span className="text-[7px] sm:text-[8px] lg:text-[9px] uppercase opacity-70">Lvl</span>
              <span className="text-sm sm:text-base leading-none">{l}</span>
              <span className="text-[6px] sm:text-[7px] lg:text-[8px] mt-0.5 opacity-60 font-black">{levelProgress[l]}/50</span>
            </button>
          ))}
        </div>

        {/* Center: Main Exercise Area */}
        <div className="w-full lg:flex-1 max-w-2xl order-2">
          <main className="w-full bg-white rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-indigo-50 border-t-4 sm:border-t-8 border-t-indigo-500">
            {/* Progress Header */}
            <div className="bg-indigo-50/30 p-2 sm:p-3 md:p-4 border-b border-indigo-100">
              <div className="flex justify-between items-end mb-1 sm:mb-2 md:mb-3 px-1 sm:px-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-indigo-900 font-black text-base sm:text-lg md:text-xl">Level Progress</h2>
                    {successCount > 0 && (
                      <button
                        onClick={handleResetLevel}
                        className="bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 p-1.5 rounded-lg transition-all flex items-center gap-1.5"
                        title={`Reset Level ${currentLevel} progress`}
                      >
                        <i className="fas fa-undo text-[10px] sm:text-xs"></i>
                        <span className="text-[9px] font-black uppercase tracking-tighter hidden sm:inline">Restart</span>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(setNum => {
                      const isCompleted = successCount >= setNum * BATCH_SIZE;
                      const isCurrent = currentGroup === setNum;
                      return (
                        <button
                          key={setNum}
                          onClick={() => handleSetChange(setNum)}
                          disabled={isCompleted}
                          className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all border-2 ${isCompleted
                              ? 'bg-emerald-50 text-emerald-500 border-emerald-100 opacity-80 cursor-default'
                              : isCurrent
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm scale-110'
                                : 'bg-white text-indigo-300 border-indigo-50 hover:border-indigo-200'
                            }`}
                        >
                          {isCompleted ? (
                            <div className="flex items-center gap-1">
                              <i className="fas fa-check-circle"></i>
                              <span>Set {setNum}</span>
                            </div>
                          ) : (
                            `Set ${setNum}`
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-600">{groupProgress}</span>
                  <span className="text-indigo-300 font-bold ml-1 text-sm sm:text-base">/ {BATCH_SIZE}</span>
                </div>
              </div>
              <ProgressBar current={groupProgress} total={BATCH_SIZE} />

              <div className="mt-1.5 sm:mt-2 md:mt-3 flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 sm:px-2">
                <span>Overall Level Mastery</span>
                <span>{successCount} / {SUCCESS_THRESHOLD}</span>
              </div>
              <div className="h-8 sm:h-10 mt-1 flex flex-col justify-center">
                {isInRepetitionMode && failedQueue.length > 0 ? (
                  <div className="text-center animate-in slide-in-from-bottom-2 duration-300">
                    <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-3 sm:px-4 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border-2 border-amber-300">
                      <i className="fas fa-redo text-amber-700"></i>
                      <span>Review Mode: {repetitionIndex + 1} / {failedQueue.length}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Exercise Area */}
            <div className="p-4 sm:p-5 md:p-6 lg:p-8 flex flex-col items-center justify-center relative bg-white">
              {currentExercise ? (
                <div className="w-full text-center space-y-3 sm:space-y-4 md:space-y-5 lg:space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="flex flex-col items-center justify-center min-h-[140px] sm:min-h-[160px] md:min-h-[180px] lg:min-h-[200px] w-full px-2 sm:px-4">
                    <span className={`georgian-text ${fontSizeClass} font-bold text-indigo-950 leading-tight select-none tracking-normal drop-shadow-sm break-words w-full overflow-wrap-anywhere transition-all duration-300`}>
                      {currentExercise.georgian}
                    </span>
                  </div>

                  <div className="h-[90px] sm:h-[100px] md:h-[110px] lg:h-[120px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl sm:rounded-3xl p-3 sm:p-4 md:p-5 border border-slate-100">
                    {showTranscription ? (
                      <div className="animate-in slide-in-from-bottom-2 duration-300 text-center space-y-1 sm:space-y-2">
                        <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-indigo-600 tracking-tighter uppercase">{currentExercise.transcription}</p>
                        {currentExercise.meaning && (
                          <p className="text-xs sm:text-sm text-slate-400 font-semibold italic">
                            {/syllable|letter|root|suffix/i.test(currentExercise.meaning)
                              ? currentExercise.meaning
                              : `"${currentExercise.meaning}"`}
                          </p>
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

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 w-full pt-2 sm:pt-3 md:pt-4">
                    <button
                      onClick={handleCouldntRead}
                      className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 bg-slate-50 hover:bg-slate-100 text-slate-400 font-black rounded-xl sm:rounded-[2rem] transition-all border-b-2 sm:border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 uppercase tracking-widest text-[10px] sm:text-xs"
                    >
                      Couldn't Read
                    </button>
                    <button
                      onClick={handleCorrect}
                      className="py-3 sm:py-4 md:py-5 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl sm:rounded-[2rem] transition-all border-b-2 sm:border-b-4 border-indigo-900 active:border-b-0 active:translate-y-1 shadow-xl uppercase tracking-widest text-[10px] sm:text-xs"
                    >
                      I Read It!
                    </button>
                  </div>
                </div>
              ) : isLevelMastered ? (
                <div className="text-center p-6 sm:p-8 md:p-12 animate-in zoom-in duration-500">
                  <i className="fas fa-check-circle text-emerald-500 text-4xl sm:text-5xl md:text-6xl mb-4 sm:mb-6"></i>
                  <h3 className="text-xl sm:text-2xl font-black text-indigo-900 mb-2">Level Complete!</h3>
                  <p className="text-sm sm:text-base text-slate-500 font-medium mb-6 sm:mb-8">
                    You've mastered all {SUCCESS_THRESHOLD} items in this level.
                  </p>
                  <button
                    onClick={() => handleLevelChange(currentLevel + 1 <= 6 ? currentLevel + 1 : 1)}
                    className="bg-indigo-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-[2rem] font-black shadow-lg hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px] sm:text-xs"
                  >
                    Go to {currentLevel + 1 <= 8 ? `Level ${currentLevel + 1}` : "Level 1"}
                  </button>
                </div>
              ) : null}
            </div>
          </main>
        </div>

        {/* Right Sidebar: Recent Progress */}
        <aside className="w-full lg:w-72 mt-6 lg:mt-0 lg:max-h-[85vh] lg:overflow-y-auto lg:pr-2 order-3">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-black text-indigo-900 tracking-tight">Recent</h2>
            <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              {successfulHistory.length + unsuccessfulHistory.length}
            </span>
          </div>

          <div className="space-y-6">
            {/* Needs Review Column */}
            {unsuccessfulHistory.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <h3 className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Needs Review</h3>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                  {unsuccessfulHistory.map((h, i) => (
                    <div
                      key={`unsuccess-${h.id}-${i}`}
                      className="bg-amber-50 py-1.5 px-2 rounded-lg border border-amber-200 text-center animate-in slide-in-from-right-2 duration-300"
                    >
                      <p className="georgian-text text-base font-bold text-amber-950 leading-tight">{h.georgian}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Successful Column */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Successful</h3>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                {successfulHistory.map((h, i) => (
                  <div
                    key={`success-${h.id}-${i}`}
                    className="bg-emerald-50 py-1.5 px-2 rounded-lg border border-emerald-200 text-center animate-in slide-in-from-right-2 duration-300"
                  >
                    <p className="georgian-text text-base font-bold text-emerald-950 leading-tight">{h.georgian}</p>
                  </div>
                ))}
                {successfulHistory.length === 0 && (
                  <div className="py-4 text-center text-emerald-300 font-black uppercase tracking-widest text-[9px] border-2 border-dotted border-emerald-100 rounded-xl">
                    None yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="w-full max-w-5xl text-center border-t border-slate-200 mt-8 py-6 opacity-50">
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">KartuliRead System</p>
        <p className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-widest">50 Items Per Level • Group Shuffle Active</p>
      </footer>
    </div>
  );
};

export default App;
