import { FlashcardResponse, NodeLinkType } from "../types";
import { INotebook } from "../types/INotebook";
import { ONECADEMY_BASEURL } from "../utils/constants";
import { delay, getIdToken } from "./common";

export const ASSISTANT_BARD_MESSAGE = "ASSISTANT_BARD_MESSAGE";
export const ASSISTANT_BARD_RESPONSE = "ASSISTANT_BARD_RESPONSE";

export const ASSISTANT_BARD_ACTIONS = {
  REQUEST: "ASSISTANT_BARD_ACTION_REQUEST",
  RESPONSE: "ASSISTANT_BARD_ACTION_RESPONSE"
};

export const ASSISTANT_ONE_ACTIONS = {
  COMMAND_REQUEST: "ASSISTANT_ONE_ACTION_COMMAND_REQUEST",
  COMMAND_RESPONSE: "ASSISTANT_ONE_ACTION_COMMAND_RESPONSE"
};

export type IAssistantNode = {
  type: "Concept" | "Relation";
  node: string;
  title: string;
  link: string;
  content: string;
  nodeImage?: string;
  nodeVideo?: string;
  practice?: {
    totalQuestions: number;
    answered: number;
  };
  unit?: string;
};

export const ASSISTANT_NOT_FOUND_MESSAGE =
  `I'm afraid this topic is not included in the course content that I have been trained on. However, I would be happy to help you in one of the following ways:\n` +
  `- I can provide you with an explanation based on my general knowledge outside of the course content.\n` +
  `- Alternatively, if you would like to contribute to the knowledge graph of the course, I am open to learning from you and expanding my knowledge on the topic.`;

export const getBardMessagesCount = async (tabId: number) => {
  const response = await chrome.scripting.executeScript({
    target: {
      tabId
    },
    args: [],
    func: () => {
      return document.querySelectorAll(".ng-trigger-responsePopulation.ng-animate-disabled").length
    }
  });
  return response?.[0]?.result || 0;
}

export const extractSearchCommands = (response: string): string[] => {
  const commandIndices: number[] = [];
  const commands: string[] = [];

  let commandIdx: number = -1;
  do {
    let oneToken = response.indexOf("\\1Cademy\\", commandIdx + 1) === -1 ? "\\1Academy\\" : "\\1Cademy\\";
    commandIdx = response.indexOf(oneToken, commandIdx + 1);
    if (commandIdx !== -1) commandIndices.push(commandIdx);
  } while (commandIdx !== -1);

  for (let i = 0; i < commandIndices.length; i++) {
    const startIdx = commandIndices[i];
    // we need boundary to not overlap next command
    const lastEndIdx = response.indexOf("\n", startIdx + 1);
    
    let command = response.substring(startIdx, lastEndIdx + 1);
    command = command
      .replace(/^\\1(Ac|C)ademy\\/, "")
      .replace(/\\$/, "")
      .trim();
    commands.push(command);
  }

  return commands;
};

export const getNodesFromTitles = (nodesList: string[], assistantNodes: IAssistantNode[]) => {
  const nodes: IAssistantNode[] = [];

  const _assistantNodes: {
    [title: string]: IAssistantNode
  } = {};

  for(const assistantNode of assistantNodes) {
    _assistantNodes[assistantNode.title] = assistantNode;
  }

  for(const nodeTitle of nodesList) {
    if(!_assistantNodes[nodeTitle]) continue;
    nodes.push(_assistantNodes[nodeTitle]);
  }

  return nodes;
}

export const getBardLastMessage = async (tabId: number) => {
  const response = await chrome.scripting.executeScript({
    target: {
      tabId
    },
    args: [],
    func: () => {
      const messageContainers = Array.from(document.querySelectorAll(".ng-trigger-responsePopulation.ng-animate-disabled"));
      const messageContainer = messageContainers[messageContainers.length - 1];
      if(!messageContainer) return "";
      const el = messageContainer.querySelector(".response-container-content") as HTMLElement;
      const blocks = Array.from(el.querySelectorAll(".code-block-wrapper"));
      blocks.forEach((block) => block.parentElement?.removeChild(block));
      return String((el.querySelector("message-content[id^=\"message-content-\"]")! as HTMLElement)?.innerText).trim();
    }
  });
  return response?.[0]?.result || "";
}

export const getBardPromptResponse = async (tabId: number, prompt: string): Promise<string> => {
  const prevMessageCount = await getBardMessagesCount(tabId);

  // sending prompt
  await chrome.scripting.executeScript({
    target: {
      tabId
    },
    args: [prompt],
    func: (prompt: string) => {
      const textarea = document.querySelector("textarea[aria-label~=\"prompt\"]") as HTMLTextAreaElement;
      textarea.value = prompt;
      textarea.dispatchEvent(new InputEvent("input"))
    }
  });
  await delay(200);
  await chrome.scripting.executeScript({
    target: {
      tabId
    },
    args: [],
    func: () => {
      const submitBtn = document.querySelector("button[mattooltip=\"Submit\"]") as HTMLButtonElement;
      submitBtn.click();
    }
  });
  
  // looking for response
  return new Promise((resolve) => {
    const checker = async () => {
      const nextMessageCount = await getBardMessagesCount(tabId);
      if(prevMessageCount != nextMessageCount) {
        const response = await getBardLastMessage(tabId);
        resolve(response);
      } else {
        setTimeout(() => {
          checker();
        }, 200);
      }
    };
    checker();
  });
}

export const getBardQueryPrompt = (passage: string) => {
  return `You're a tutor and I'm a student.\n` +
    `We have a database of flashcards.\n` +
    `What should I search in our flashcard database to learn the following triple-quoted text?\n` +
    `'''\n` +
    passage + `\n` +
    `'''\n` +
    `Give me query strings with this pattern: \`\\1Cademy\\ [Your Query goes here]\\\`\n` +
    `Only respond with an Array of query strings like:\n` +
    `[\n` +
    `"\\1Cademy\\ capitalist revolution",\n` +
    `"\\1Cademy\\ history of capitalism"\n` +
    `]\n` +
    `DO NOT print any extra text or explanation.`
}

export const getBardTeachMePrompt = (passage: string, nodes: IAssistantNode[]): string => {
  const prompt = `'''\n` +
  passage +
  "\n" +
  `'''\n` +
  `I am a student. Explain the above selected text (in triple-quotes) ONLY based on the content of this course shown in the following nodes. For each node, I've specified its title, content, and correct_answers (the number of times I've answered it correctly) in the following JSON object.\n` +
  generateNodesPrompt(nodes) +
  `\n` +
  `Your response should be ONLY a JSON object with your well-explained response to my question and the list of titles of the nodes that you used in your explanation, with the following structure:\n` +
  `{\n` +
  `   "response": "Your well-explained response to my question",\n` +
  `   "nodes":\n` +
  `   [\n` +
  `      "The title of the node 1",\n` +
  `      "The title of the node 2",\n` +
  `      "The title of the node 3"\n` +
  `   ]\n` +
  `}`;

  if(prompt.length > 10000) {
    const _nodes = [...nodes];
    _nodes.pop();
    return getBardTeachMePrompt(passage, _nodes);
  }
  
  return prompt;
};

export const getBardDirectQuestionPrompt = (passage: string, nodes: IAssistantNode[]): string => {
  const prompt = `I am a student. Answer my following question, but NEVER give me the direct solution to a problem. That would be considered cheating. Instead, guide me step-by-step, to find the solution on my own.\n` +
  `'''\n` +
  passage +
  "\n" +
  `'''\n` +
  generateNodesPrompt(nodes) +
  `\n` +
  `Your response should be only a JSON object with your well-explained response to my question. Your response JSON object should also include "nodes" key. Its value should be the list of titles of only the nodes that you used in your explanation, excluding the remaining nodes.\n` +
  `Your response JSON object should have the following structure:\n` +
  `{\n` +
  `   "response": "Your well-explained response to my question"\n,` +
  `   "nodes":\n` +
  `   [\n` +
  `      "The title of the node 1",\n` +
  `      "The title of the node 2",\n` +
  `      "The title of the node 3"\n` +
  `   ]\n` +
  `}`;

  if(prompt.length > 10000) {
    const _nodes = [...nodes];
    _nodes.pop();
    return getBardDirectQuestionPrompt(passage, _nodes);
  }
  
  return prompt;
};

export const escapeLineBreaksInQuotedStrings = (content: string) => {
  let _content = content;
  const quoteIndices: number[] = [];
  for(let i = 0; i < content.length; i++) {
    if(content[i] === "\"" && content[i-1] !== "\\") {
      quoteIndices.push(i);
    }
  }
  const quoteIndicesPairs: [number, number][] = [];
  for(let i = 0; i < content.length; i += 2) {
    quoteIndicesPairs.push([quoteIndices[i], quoteIndices[i + 1]]);
  }

  const replacementTexts: string[] = [];

  for(const quoteIndicesPair of quoteIndicesPairs) {
    const text = content.substring(quoteIndicesPair[0], quoteIndicesPair[1] + 1);
    replacementTexts.push(text);
  }

  for(const replacementText of replacementTexts) {
    _content = _content.replace(replacementText, replacementText.replace(/\n/g, "\\n"));
  }

  return _content;
}

export const escapeLineBreaksInBacktickStrings = (content: string) => {
  let _content = content;
  const quoteIndices: number[] = [];
  for(let i = 0; i < content.length; i++) {
    if(content[i] === "\`" && content[i-1] !== "\\") {
      quoteIndices.push(i);
    }
  }
  const quoteIndicesPairs: [number, number][] = [];
  for(let i = 0; i < content.length; i += 2) {
    quoteIndicesPairs.push([quoteIndices[i], quoteIndices[i + 1]]);
  }

  const replacementTexts: string[] = [];

  for(const quoteIndicesPair of quoteIndicesPairs) {
    const text = content.substring(quoteIndicesPair[0], quoteIndicesPair[1] + 1);
    replacementTexts.push(text);
  }

  for(const replacementText of replacementTexts) {
    let _replacementText = replacementText.replace(/\n/g, "\\n").replace(/"/g, "\\\"").split("");
    _replacementText[0] = "\"";
    _replacementText[_replacementText.length - 1] = "\"";
    _content = _content.replace(replacementText, _replacementText.join(""));
  }

  return _content;
}

export const parseJSONObjectResponse = (content: string) => {
  const matchResult = content.match(/\{[\t\n ]*?\"/gm);
  const startIdx = content.indexOf(matchResult![0]);
  let endIdx = -1;
  const stack: string[] = ["{"];
  for (let idx = startIdx + 1; idx < content.length; idx++) {
    if (content[idx] === "{" || content[idx] === "[") {
      stack.push(content[idx]);
    } else if (content[idx] === "}" || content[idx] === "]") {
      const opening = stack.pop();
      if ((opening !== "{" && content[idx] === "}") || (opening !== "[" && content[idx] === "]")) {
        throw new Error(`Invalid syntax at ${idx}`);
      }
    }

    if (stack.length === 0) {
      endIdx = idx;
      break;
    }
  }

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Invalid JSON provided`);
  }

  return JSON.parse(
    escapeLineBreaksInQuotedStrings(
      content.substring(startIdx, endIdx + 1)
    )
  );
};

export const generateNodesPrompt = (nodes: IAssistantNode[]) => {
  let result = `[\n`;
  let nodesList: string[] = [];
  for(const node of nodes) {
    let nodeResult = `  {\n`;
    nodeResult += `    "title": '''${node.title}''',\n`;
    nodeResult += `    "content": '''${node.content}''',\n`;
    nodeResult += `    "correct_answers": ${node?.practice?.answered || 0}\n`;
    nodeResult += `  }`;
    nodesList.push(nodeResult);
  }
  result += nodesList.join(",\n");
  result += `\n]`;

  return result;
}

export const getBardQuestionPrompt = (passage: string) => {
  return `You're a tutor and I'm a student.\n` +
    `We have a database of flashcards.\n` +
    `What should I search in our flashcard database to learn the following triple-quoted text?\n` +
    `'''\n` +
    passage + `\n` +
    `'''\n` +
    `Give me query strings with this pattern: \`\\1Cademy\\ [Your Query goes here]\\\`\n` +
    `Only respond with an Array of query strings like:\n` +
    `[\n` +
    `"\\1Cademy\\ capitalist revolution",\n` +
    `"\\1Cademy\\ history of capitalism"\n` +
    `]\n` +
    `DO NOT print any extra text or explanation.`
}

export const getBardTabId = async () : Promise<number> => {
  const [tab] = await chrome.tabs.query({
    url: "https://bard.google.com/*"
  });
  if(tab) {
    return tab.id!;
  }

  const tab2 = await chrome.tabs.create({
    url: "https://bard.google.com"
  });
  return tab2.id!;
}

export const isBardChatAvailable = async (tabId: number) => {
  const response = await chrome.scripting.executeScript({
    target: {
      tabId
    },
    args: [],
    func: () => {
      const promptInputs = Array.from(document.querySelectorAll("textarea")).filter((txtarea) => String(txtarea.getAttribute("aria-label")).toLowerCase().includes("prompt"));
      if(promptInputs.length) return true;
      return false;
    }
  });
  return response?.[0]?.result || false;
}

export const waitUntilBardAvailable = async (tabId: number): Promise<boolean> => {
  const isAvailable = await isBardChatAvailable(tabId);
  if(isAvailable) {
    return true;
  }
  delay(200);
  return waitUntilBardAvailable(tabId);
}

export const createConversation = async (): Promise<string> => {
  const request = await fetch(`${ONECADEMY_BASEURL}/api/assistant/createConversation`, {
    method: "POST"
  });
  const response = await request.json();
  return response.conversationId as string
}

export const getTopic = async (passage: string): Promise<string> => {
  const request = await fetch(`${ONECADEMY_BASEURL}/api/assistant/getTopic`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      passage
    })
  });
  const response = await request.json();
  return response.topic as string
}

export const getNotebooks = async (tabId: number): Promise<INotebook[]> => {
  const headers: any = {
    "Content-Type": "application/json"
  };
  const token = await getIdToken(tabId);
  console.log({token});
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const request = await fetch(`${ONECADEMY_BASEURL}/api/assistant/getNotebooks`, {
    method: "GET",
    headers
  });
  return ((await request.json()) || []) as INotebook[];
}

export const getFlashcards = async (passage: string, url: string): Promise<FlashcardResponse> => {
  const request = await fetch(`${ONECADEMY_BASEURL}/api/assistant/getFlashcards`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      passage,
      url
    })
  });
  return ((await request.json())?.topic || []) as FlashcardResponse;
}

export const getReferenceNodes = async (query: string): Promise<NodeLinkType[]> => {
  const _url = query.split("/").slice(0, 3).join("/");
  const request = await fetch(`${ONECADEMY_BASEURL}/api/assistant/getReferenceNodes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: _url
    })
  });
  return ((await request.json()) || []) as NodeLinkType[];
}

export const combineContent = async (passages: string[]): Promise<string> => {
  const request = await fetch(`${ONECADEMY_BASEURL}/api/assistant/combineContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      passages
    })
  });
  return String(((await request.json()) || {content: ""}).content);
}

export type ProposeFlashCardParam = {
  token: string;
  url: string; // book url
  passageId: string; // passage id
  title: string; // flashcard title
  node?: string;
  version: string;
  flashcard:any;
};

export const proposeFlashcard = async ({
  token,
  url,
  passageId,
  title,
  node,
  version,
  flashcard
}: ProposeFlashCardParam) => {
  const headers: any = {
    "Content-Type": "application/json"
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const request = await fetch(`${ONECADEMY_BASEURL}/api/assistant/proposeFlashcard`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      url,
      passageId,
      title,
      node,
      version, 
      tempflashcard:flashcard, 
    })
  });
  return ((await request.json()) || []) as INotebook[];
}

export const matchReferenceContent = (src: string, referenceContent: string) => {
  let src_parts = src.split("/");
  const count = src_parts.length;
  for(let i = 0; i < count - 1; i++) {
    let _src = src_parts.join("/");
    if(referenceContent.includes(_src)) {
      return _src.length;
    }
    src_parts.pop()
  }
  return 0;
}

export const findPossibleReferenceFromList = (url: string, references: NodeLinkType[]): NodeLinkType | undefined => {
  let _references = references.map((reference) => {
    return {
      reference,
      match: matchReferenceContent(url, reference.content)
    }
  });
  _references.sort((r1, r2) => r1.match < r2.match ? 1 : -1)
  return _references.length ? _references[0].reference : undefined;
}

export type IAssistantMessageRequest = {
  tabId?: number;
  type: "ASSISTANT_BARD_ACTION_REQUEST",
  message: string;
  selection: string;
  requestAction: IAssitantRequestAction;
  nodes: IAssistantNode[];
  conversationId?: string;
} | {
  tabId?: number;
  type: "ASSISTANT_ONE_ACTION_COMMAND_REQUEST",
  requestAction: IAssitantRequestAction;
  commands: string[];
  selection: string;
  conversationId?: string;
};

export type IAssitantRequestAction =
| "Practice"
| "TeachContent"
| "PracticeLater"
| "Understood"
| "ExplainMore"
| "GeneralExplanation"
| "IllContribute"
| "DirectQuestion";

export type IAssistantMessageResponse = {
  type: "ASSISTANT_BARD_ACTION_RESPONSE",
  requestAction: IAssitantRequestAction;
  message: string;
  selection: string;
  // these nodes are from original request (not part of response from Bard)
  nodes: IAssistantNode[];
  conversationId?: string;
} | {
  type: "ASSISTANT_ONE_ACTION_COMMAND_RESPONSE",
  requestAction: IAssitantRequestAction;
  message: {
    nodes: IAssistantNode[]
  };
  selection: string;
  conversationId?: string;
} | {
  type: "ASSISTANT_CHAT_RESPONSE",
  requestAction: IAssitantRequestAction;
  message: string;
  is404?: boolean;
  nodes?: IAssistantNode[];
  actions?: {
    type: IAssitantRequestAction;
    title: string;
    variant: "contained" | "outline";
  }[];
  conversationId?: string;
};