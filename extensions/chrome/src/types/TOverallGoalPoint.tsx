import { Timestamp } from "firebase/firestore";

export type TOverallGoalPoint = {
  documentId?: string;
  goal: string;
  uname: string;
  points: number;
  createdAt: Timestamp | Date;
}