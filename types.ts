
export interface Exercise {
  id: string;
  georgian: string;
  transcription: string;
  meaning?: string;
}

export interface UserProgress {
  level: number;
  successesInCurrentLevel: number;
}

export const SUCCESS_THRESHOLD = 50; 
export const BATCH_SIZE = 10;
