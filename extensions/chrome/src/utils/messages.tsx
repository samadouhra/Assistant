import { ReactNode } from "react";
import { PieChart } from "../components/Charts/PieComponent";
import { MessageData, NodeLinkType } from "../components/ChatApp/Chat";
import { getCurrentHourHHMM } from "./date";
import { generateRandomId } from "./others";


export const generateContinueDisplayingNodeMessage = (title: string, unit: string, thereIsNextNode: boolean, practice?: { answered: number, totalQuestions: number }, componentContent?: ReactNode): MessageData => {
  return {
    actions: [],
    content: `You learned about "${title}" in Unit ${unit}. ${practice ? `You've correctly answered ${practice.answered} out of ${practice.totalQuestions} related practice questions.` : ""}`,
    // componentContent: practice ? PieChart({ answers: practice.answered, questions: practice.totalQuestions }) : null,// INFO: on my editor I was having an error to use in this way: <PieChart/>
    componentContent,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
  }
}

export const generateNodeMessage = (node: NodeLinkType): MessageData => {
  return {
    actions: [],
    content: node.content,
    nodes: [node],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: node.nodeImage,
    video: node.nodeVideo,
  }
}

export const generateWhereContinueExplanation = (notebookName: string, isAuthenticated: boolean, notebookCreatedRecently: boolean): MessageData => {

  return isAuthenticated
    ? ({
      actions: [
        {
          title: "Open the notebook",
          type: "LOCAL_OPEN_NOTEBOOK",
          variant: "outlined"
        },
        {
          title: "Explain the nodes here",
          type: "LOCAL_CONTINUE_EXPLANATION_HERE",
          variant: "outlined"
        },
      ],
      content: notebookCreatedRecently
        ? `I just created a new notebook for you called "${notebookName}" and added the nodes explaining the answer to your question. Would you like to open the notebook or prefer to see the explanation of the nodes here in text.`
        : `I added more nodes to your notebook ${notebookName} to help answering your question. Would you like to open the notebook or prefer to see the explanation of the nodes here in text?`,
      nodes: [],
      type: "READER",
      hour: getCurrentHourHHMM(),
      id: generateRandomId(),
      image: "",
      video: "",
    })

    : ({
      actions: [],
      content: `Log in to 1Cademy to personalize my responses to your questions.`,
      nodes: [],
      type: "READER",
      hour: getCurrentHourHHMM(),
      id: generateRandomId(),
      image: "",
      video: "",
    })
}

export const generateUserActionAnswer = (content: string): MessageData => {
  return {
    actions: [],
    content,
    nodes: [],
    type: "WRITER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
  }
}

export const generateTopicNotFound = (request: string, isAuthenticated: boolean): MessageData => {
  return {
    actions: isAuthenticated ? [
      {
        title: "Provide me an explanation",
        type: "GeneralExplanation",
        variant: "outlined"
      },
      {
        title: "I’ll contribute",
        type: "IllContribute",
        variant: "outlined"
      },
    ] : [
      {
        title: "Provide me an explanation",
        type: "GeneralExplanation",
        variant: "outlined"
      },
    ],
    content: "I'm afraid this topic is not included in the course content that I have been trained on. However, I would be happy to help you in one of the following ways:- I can provide you with an explanation based on my general knowledge outside of the course content.- Alternatively, if you would like to contribute to the knowledge graph of the course, I am open to learning from you and expanding my knowledge on the topic.",
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
    request
  }
}

export const generateExplainSelectedText = (selectedText: string): MessageData => {
  return {
    actions: [],
    content: "Explain the following text that I selected from the textbook: *" + selectedText + "*",
    nodes: [],
    type: "WRITER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
  }
}