import { Timestamp } from "firebase/firestore"
import { TNodeType } from "./TNodeType"

export type TGPTGeneratedNode = {
  nodeTitle: string,
  recursion: number,
  prompt: string,
  response: string,
  parsedNodes: {
    title: String,
    type: TNodeType
  }[],
  generatedNodes: {
    prompt: string,
    response: string,
    parsedContent: string,
    nodeId?: string,
    parentTitles: string[],
    childrenTitles: string[]
  }[],
  startIndex: number,
  processed: boolean,
  botId?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}