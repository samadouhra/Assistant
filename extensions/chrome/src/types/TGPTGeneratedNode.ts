import { Timestamp } from "firebase/firestore"
import { TNodeType } from "./TNodeType"

export type TGPTGeneratedNode = {
  nodeTitle: string,
  nodeContent?: string,
  contentPrompt?: string,
  contentResponse?: string,
  parentTitles?: string[],
  childrenTitles?: string[],
  contentDone: boolean,
  recursion: number,
  prompt: string,
  response: string,
  parsedNodes: {
    title: String,
    type: TNodeType
  }[],
  nodes: string[], // we can use this to filter parent documents
  // generatedNodes: {
  //   prompt: string,
  //   response: string,
  //   parsedContent: string,
  //   nodeId?: string,
  //   parentTitles: string[],
  //   childrenTitles: string[]
  // }[],
  // startIndex: number,
  processed: boolean,
  botId?: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}