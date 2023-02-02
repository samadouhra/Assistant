import { Timestamp } from "firebase/firestore";

export type TMeeting = {
  documentId?: string;
  attendees: string[];
  start_time: Timestamp | Date;
  end_time: Timestamp | Date;
  uname: string;
  description: string;
  location: string;
  type: string;
  status: string;
  createdAt: Timestamp | Date;
};
