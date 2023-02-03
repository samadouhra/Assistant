import { Timestamp } from "firebase/firestore";

export type TGoalStatus = "Not Started" | "In Progress" | "Accomplished" | "NotAccomplished";
export type TGoalType = "SmartGoal" | "Conventional";

export type TGoal = {
  documentId?: string;
  description: string;
  type: TGoalType;
  metadata?: any; // Metadata for Third-party Integrations
  status: TGoalStatus;
  start_date: Timestamp | Date;
  end_date: Timestamp | Date;
  progress: number;
  uname: string;
  deleted?: boolean;
  createdAt: Timestamp | Date;
}