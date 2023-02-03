import { Timestamp } from "firebase/firestore";
import { THourPreference } from "./THourPreference";

export type TTaskType = "Smart" | "Conventional" | "GoogleMeeting";
export type TTaskStatus = "Pending" | "Done" | "Unattained";

export type TTask = {
  documentId?: string;
  goal?: string;
  subGoal?: string;
  description: string;
  type: TTaskType;
  metadata?: any; // It can store extra data for integrations i.e. eventId, attendees from meeting
  hourPreference: THourPreference,
  status: TTaskStatus;
  dueTime: Timestamp | Date;
  durtation: number; // in seconds
  progress: number;
  uname: string;
  deleted?: boolean;
  createdAt: Timestamp | Date;
}