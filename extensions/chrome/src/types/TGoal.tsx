import { Timestamp } from "firebase/firestore";

export type TGoal = {
  documentId?: string;
  name: string;
  description: string;
  type: string;
  status: string;
  start_date: Timestamp | Date;
  end_date: Timestamp | Date;
  progress: number;
  uname: string;
  createdAt: Timestamp | Date;
}