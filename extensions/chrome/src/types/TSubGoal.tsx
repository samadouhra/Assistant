import { Timestamp } from "firebase/firestore";

export type TSubGoalStatus = "Not Started" | "Accomplished" | "NotAccomplished";
export type TSubGoalType = "SmartGoal" | "Conventional";

export type TSubGoal = {
  documentId?: string;
  goal: string;
  description: string;
  type: TSubGoalType;
  status: TSubGoalStatus;
  start_date: Timestamp | Date; // TODO: do we need start and 
  end_date: Timestamp | Date;   //       end time for sub goal?
  progress: number;
  uname: string;
  deleted?: boolean;
  createdAt: Timestamp | Date;
}