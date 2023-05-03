import { MessageData, NodeLinkType } from "../components/ChatApp/Chat";
import { getCurrentHourHHMM } from "./date";
import { generateRandomId } from "./others";


export const generateContinueDisplayingNodeMessage = (title: string, unit: string, thereIsNextNode: boolean): MessageData => {
    return {
        actions: []/* thereIsNextNode ? [
            {
                title: "Let’s keep going",
                type: "LOCAL_DISPLAY_NEXT_MESSAGE_NODE",
                variant: "outlined",
            },
            {
                title: "Please explain this more",
                type: "ExplainMore",
                variant: "outlined"
            }
        ] : [
            {
                title: "Please explain this more",
                type: "ExplainMore",
                variant: "outlined"
            }
        ] */,
        content: `You learned about "${title}" in Unit ${unit}. Because you correctly answered all the related practice questions, it's a while I've not asked you about this concept.`,
        nodes: [],
        type: "READER",
        hour: getCurrentHourHHMM(),
        id: generateRandomId(),
        image: "",
        uname: "You"
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
        image: "",
        uname: "You"
    }
}

export const generateWhereContinueExplanation = (notebookName: string): MessageData => {
    return {
        actions: [{
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
        content: `I just created a new notebook for you called "${notebookName}" and added the nodes explaining the answer to your question. Would you like to open the notebook or prefer to see the explanation of the nodes here in text.`,
        nodes: [],
        type: "READER",
        hour: getCurrentHourHHMM(),
        id: generateRandomId(),
        image: "",
        uname: "You"
    }
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
        uname: "You"
    }
}