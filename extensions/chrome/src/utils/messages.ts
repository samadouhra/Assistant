import { MessageData, NodeLinkType } from "../components/ChatApp/Chat";
import { getCurrentHourHHMM } from "./date";
import { generateRandomId } from "./others";


export const generateContinueDisplayingNodeMessage = (title: string, unit: string, thereIsNextNode: boolean): MessageData => {
    return {
        actions: thereIsNextNode ? [
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
        ],
        content: `You learned about "${title}" in Unit ${unit}. Because you correctly answered all the related practice questions, it's a while I've not asked you about this concept. Would you like me to further explain it, or we can keep going?`,
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
