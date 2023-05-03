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

export const generateTopicNotFound = (request: string): MessageData => {
    return {
        actions: [
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
        ],
        content: "I'm afraid this topic is not included in the course content that I have been trained on. However, I would be happy to help you in one of the following ways:- I can provide you with an explanation based on my general knowledge outside of the course content.- Alternatively, if you would like to contribute to the knowledge graph of the course, I am open to learning from you and expanding my knowledge on the topic.",
        nodes: [],
        type: "READER",
        hour: getCurrentHourHHMM(),
        id: generateRandomId(),
        image: "",
        uname: "You",
        request
    }
}