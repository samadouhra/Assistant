import { Timestamp } from "firebase/firestore";

export type TUserPoint = {
  documentId?: string;
  uname: string;
  points: number;
  createdAt: Timestamp | Date;
}