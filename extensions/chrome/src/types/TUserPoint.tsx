import { Timestamp } from "firebase/firestore";

export type TUserPoint = {
  documentId?: string;
  uname: string;
  achievedPoints: number;
  totalPoints: number;
  createdAt: Timestamp | Date;
}