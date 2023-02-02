import { Timestamp } from "firebase/firestore";

export type TOverallGoalPoint = {
  documentId?: string;
  goal: string;
  uname: string;
  achievedPoints: number;
  totalPoints: number;
  createdAt: Timestamp | Date;
}