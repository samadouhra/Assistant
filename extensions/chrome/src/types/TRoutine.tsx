import { Timestamp } from "firebase/firestore";
import { TWeekDay } from "./TWeekDay";

export type TRoutine = {
  documentId?: string;
  uname: string;
  subGoal?: string; // If sub goal mentioned, it should auto created tasks under that sub goal
  minTime: number;
  maxTime: number;
  weekDays: TWeekDay[];
  deleted?: boolean;
  createdAt: Timestamp | Date;
}