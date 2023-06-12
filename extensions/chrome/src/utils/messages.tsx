import { getCurrentHourHHMM } from "./date";
import { generateRandomId } from "./others";
import { Flashcard, MessageAction, MessageData, NodeLinkType } from "../types";
import { INotebook } from "../types/INotebook";


export const generateContinueDisplayingNodeMessage = (title: string, unit: string, thereIsNextNode: boolean, practice?: { answered: number, totalQuestions: number }, componentContent?: any): MessageData => {
  return {
    actions: [],
    content: `You learned about "${title}" in Unit ${unit}. ${(practice?.answered && practice?.totalQuestions) ? `You've correctly answered ${practice.answered} out of ${practice.totalQuestions} related practice questions.` : ""}`,
    // componentContent: practice ? <PieChart answers={practice.answered} questions={practice.totalQuestions} /> : undefined,// INFO: on my editor I was having an error to use in this way: <PieChart/>
    // componentContent,
    practice,
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

export const generateTopicMessage = (request: string, topics: string[]): MessageData => {
  return {
    actions: [
      {
        title: "Explain it",
        type: "TeachContent",
        variant: "outlined"
      },
      {
        title: "Propose it on 1Cademy",
        type: "ProposeIt",
        variant: "outlined"
      },
    ],
    content: `The text your've selected talks about ${topics.join(", ")}. Which of the following would you like to do with it?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
    request
  }
}

export const generateNotebookIntro = (flashcards: Flashcard[]): MessageData => {
  return {
    actions: [],
    content: `I extracted ${flashcards.length} potential nodes from your selected text. I'm going to assist you step-by-step to propose a node for each of them that you find necessary.`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateNotebookProposalApproval = (request: string, notebook: INotebook): MessageData => {
  return {
    actions: [
      {
        title: "Yes",
        type: "NotebookSelected",
        variant: "outlined",
        data: {
          notebook
        }
      },
      {
        title: "No",
        type: "ChooseNotebook",
        variant: "outlined"
      },
    ],
    content: `Would you like to propose the child/improvement in the current notebook "${notebook.title}", or switch it to another notebook?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
    request
  }
}

export const generateNotebookListMessage = (request: string, notebooks: INotebook[]): MessageData => {
  const actions: MessageAction[] = notebooks.map((notebook) => ({
    title: notebook.title,
    type: "NotebookSelected",
    variant: "outlined",
    data: {
      notebook
    }
  }));
  actions.push({
    title: "Create a New Notebook",
    type: "ChatNotebookCreate",
    variant: "outlined",
  });

  return {
    actions,
    content: `Which of the following notebooks would you like to open?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: "",
    request
  }
}

export const generateNodeProposeMessage = (node: Flashcard, nodeIdx: number): MessageData => {
  return {
    actions: [],
    content: `**Node ${nodeIdx}:**\n**${node.title}**\n${node.content}`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateSearchNodeMessage = (): MessageData => {
  return {
    actions: [],
    content: `I searched 1Cademy and listed all the relevant nodes to the above potential node in Search sidebar on the left. You can open any of the search results in your notebook and search more nodes.`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateNodeDiscoverMessage = (): MessageData => {
  return {
    actions: [
      {
        title: "Yes",
        type: "ProposeImprovementConfirm",
        variant: "outlined",
      },
      {
        title: "No",
        type: "StartChildProposal",
        variant: "outlined",
      }
    ],
    content: `Can you find any node on 1Cademy that explains the same content as this potential node?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateConfirmContinueWithPotentialNodeMessage = (): MessageData => {
  return {
    actions: [
      {
        title: "Yes",
        type: "ProceedPotentialNodes",
        variant: "outlined",
      },
      {
        title: "No",
        type: "DontProceedPotentialNodes",
        variant: "outlined",
      }
    ],
    content: `Would you like to continue with the next potential node?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateConfirmNodeSelection = (node: { title: string, [key: string]: any }): MessageData => {
  // Then, would you like to go back to the original document to continue reading it?
  return {
    actions: [
      {
        title: "Yes",
        type: "ConfirmNodeSelection",
        variant: "outlined",
        data: {
          node
        }
      },
      {
        title: "No",
        type: "ContinueNodeSelection",
        variant: "outlined",
      }
    ],
    content: `Did you selected "${node.title}"?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateNodeKeepSelectionMessage = (): MessageData => {
  return {
    actions: [],
    content: `You can open any of the search results in your notebook and search more nodes.\nClick on Node to select it.`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateProposeImprovementConfirmation = (node: { title: string, [key: string]: any }): MessageData => {
  return {
    actions: [
      {
        title: "Yes",
        type: "ConfirmNodeSelection",
        variant: "outlined",
        data: {
          node
        }
      },
      {
        title: "No",
        type: "ContinueNodeSelection",
        variant: "outlined",
      }
    ],
    content: `Would you like to propose an improvement to that node?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}

export const generateStartProposeChildConfirmation = (): MessageData => {
  return {
    actions: [
      {
        title: "Yes",
        type: "ConfirmNodeSelection",
        variant: "outlined"
      },
      {
        title: "No",
        type: "ProceedPotentialNodes",
        variant: "outlined",
      }
    ],
    content: `Would you like to propose the selected text as child nodes?`,
    nodes: [],
    type: "READER",
    hour: getCurrentHourHHMM(),
    id: generateRandomId(),
    image: "",
    video: ""
  }
}