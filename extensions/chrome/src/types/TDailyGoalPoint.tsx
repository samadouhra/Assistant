import { Timestamp } from "firebase/firestore";

export type TDailyGoalPoint = {
  documentId?: string;
  goal: string;
  uname: string;
  achievedPoints: number;
  totalPoints: number;
  day: string; // YYYY-MM-DD
  createdAt: Timestamp | Date;
}