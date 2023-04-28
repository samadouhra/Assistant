import {
  reloadGptIfRequired,
  sendPromptAndReceiveResponse,
  waitUntilChatGPTLogin,
} from "../helpers/chatgpt";
import { delay } from "../helpers/common";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, app, auth } from "../lib/firebase";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

type ContentBotProcess = {
  status: "notStarted" | "started" | "completed";
  tabId: number;
  gptTabId: number;
};

type INodeType =
  | "Relation"
  | "Concept"
  | "Code"
  | "Reference"
  | "Idea"
  | "Question"
  | "Profile"
  | "Sequel"
  | "Advertisement"
  | "News"
  | "Private";

type INode = {
  documentId?: string;
  aChooseUname: boolean;
  aImgUrl: string;
  aFullname: string;
  admin: string;
  corrects: number;
  wrongs: number;
  nodeType: INodeType;
  contribNames: string[];
  title: string;
  nodeImage?: string;
  nodeVideo?: string;
  nodeAudio?: string;
  comments: number;
  deleted: boolean;
  content: string;
  viewers: number;
  versions: number;
  isTag?: boolean;
  tags: string[];
  tagIds: string[];
  height: number; // TODO: remove during migration
  closedHeight?: number; // TODO: remove during migration
  bookmarks?: number;
  studied: number;
  references: string[];
  referenceLabels: string[];
  referenceIds: string[];
  parents: any;
  institNames: string[];
  institutions: {
    [key: string]: {
      reputation: number;
    };
  };
  locked?: boolean;
  changedAt: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  children: any;
  maxVersionRating: number;
};

const START_CONTENT_BOT = "start-content-bot";
const STOP_CONTENT_BOT = "stop-content-bot";
const CONTENT_BOT_STATUS = "content-bot-status";

const contentBotCommands = [
  START_CONTENT_BOT,
  STOP_CONTENT_BOT,
  CONTENT_BOT_STATUS,
];
const gptResearcher = "Iman YeckehZaare";

export const stopContentBot = async () => {
  await chrome.storage.local.set({
    contentBot: {
      status: "notStarted",
    } as ContentBotProcess,
  });
  await chrome.runtime.sendMessage(
    chrome.runtime.id,
    "content-status-notStarted"
  );
};

const chatGPTPrompt: any = async (
  nodeTitle: string,
  nodeContent: string,
  gptTabId: any
) => {
  let discoverPrompt: string = `Please compose a multiple-choice question based on the provided text block enclosed in triple quotes. The output should be formatted as a JSON object and consist of the following components:\n`;
  discoverPrompt += `- "Stem": This field will contain the central question.\n`;
  discoverPrompt += `- "Choices": This will be an array of potential answers. Each answer is an individual object, featuring:\n`;
  discoverPrompt += `- "choice": The text of the choice, starting with a lowercase letter followed by a period, like "a.", "b.",  "c." ...\n`;
  discoverPrompt += `- "correct": This field should state either "true" if the choice is the right answer, or "false"  if it isn't it should be boolean.\n`;
  discoverPrompt += `- "feedback": An explanation describing why the given choice is either correct or incorrect.
      Remember to follow JSON syntax rules to ensure proper formatting.\n`;

  discoverPrompt += `'''\n`;
  discoverPrompt += `"${nodeTitle}":\n`;
  discoverPrompt += `"${nodeContent}"\n`;
  discoverPrompt += `'''\n`;

  const response = await sendPromptAndReceiveResponse(gptTabId, discoverPrompt);
  try {
    return JSON.parse(response);
  } catch (err) {
    return await chatGPTPrompt(nodeTitle, nodeContent, gptTabId);
  }
};

const proposeChildNode: any = async (accessToken: any, payload: any) => {
  const apiResponse = await fetch(
    process.env.API_URL + "/api/proposeChildNode",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    }
  );
  if (!apiResponse.ok) {
    return await proposeChildNode(accessToken, payload);
  } else {
    return true;
  }
};

const nodeByIdMap: {
  [nodeId: string]: INode;
} = {};

const dfs = async (
  nodeId: string,
  gptTabId: any,
  accessToken: any,
  userData: any
) => {
  if (nodeByIdMap[nodeId]) {
    return;
  }
  const nodeRef = doc(db, "nodes", nodeId);
  let node = await getDoc(nodeRef);
  nodeByIdMap[node.id] = node.data() as INode;
  const nodeType = nodeByIdMap[node.id].nodeType;
  const tagIds = nodeByIdMap[node.id].tagIds;
  const tags = nodeByIdMap[node.id].tags;
  const totalQuestionNodes = nodeByIdMap[node.id].children.filter(
    (childNode: any) => childNode.type === "Question"
  ).length;
  console.log(totalQuestionNodes, "totalQuestionNodes");
  if (
    (nodeType === "Concept" || nodeType === "Relation") &&
    totalQuestionNodes < 4
  ) {
    const nodeTitle = nodeByIdMap[node.id].title;
    const nodeContent = nodeByIdMap[node.id].content;
    for (let i = 1; i <= 4 - totalQuestionNodes; i++) {
      const discoveredNode = await chatGPTPrompt(
        nodeTitle,
        nodeContent,
        gptTabId
      );
      console.log(discoveredNode, "discoveredNode");
      const payload: any = {
        data: {
          parentId: String(node.id),
          parentType: nodeType,
          nodeType: "Question" as INodeType,
          children: [],
          title: discoveredNode.Stem,
          content: "",
          parents: [
            {
              lable: "",
              node: node.id,
              title: nodeTitle,
              type: nodeType,
            },
          ],
          proposal: "",
          referenceIds: [],
          references: [],
          referenceLabels: [],
          summary: "",
          subType: null,
          tagIds: tagIds,
          tags: tags,
          choices: discoveredNode.Choices,
        },
      };
      await proposeChildNode(accessToken, payload);
    }
    await delay(1000);
  }
  for (const child of nodeByIdMap[node.id].children) {
    await dfs(child.node, gptTabId, accessToken, userData);
  }
};

export const contentGenerationBot = async (gptTabId: number) => {
  // response from participant
  const userCredential = await signInWithEmailAndPassword(
    auth,
    process.env.email || "",
    process.env.password || ""
  );
  const accessToken = await userCredential.user.getIdToken(false);

  const nodesRef = collection(db, "users");
  const q = query(
    nodesRef,
    where("userId", "==", userCredential.user.uid),
    limit(1)
  );
  const userDoc = await getDocs(q);
  const userData = userDoc.docs[0].data();

  let gptTab: chrome.tabs.Tab;

  try {
    gptTab = await chrome.tabs.get(gptTabId);
  } catch (e) {
    gptTab = await chrome.tabs.create({
      url: "https://chat.openai.com/chat?model=gpt-4",
    });
    gptTabId = gptTab.id!;
  }
  await chrome.tabs.update(gptTabId, {
    active: true,
  });

  console.log("checking if gpt need reload");
  // reloading gpt is required
  await reloadGptIfRequired(gptTabId);
  console.log("checking done for gpt reload");

  // waiting until chatgpt tab is loaded
  let isLoadingComplete = false;
  while (!isLoadingComplete) {
    const chatgpt = await chrome.tabs.get(gptTabId);
    if (chatgpt.status === "complete") {
      isLoadingComplete = true;
    }
  }

  // wait until chatgpt is available to chat
  const isChatAvailable = await waitUntilChatGPTLogin(gptTabId);
  if (!isChatAvailable) {
    throw new Error("ChatGPT is not available.");
  }
  const startId : any = process.env.NODE_START_ID;
  await dfs(startId, gptTabId, accessToken, userData);
  // contentGenerationBot(gptTabId);
};

export const contentBotListener = (
  command: string,
  context: chrome.runtime.MessageSender
) => {
  if (
    context.id !== chrome.runtime.id ||
    !contentBotCommands.includes(command)
  ) {
    return;
  }

  if (command === START_CONTENT_BOT) {
    // start content bot
    (async () => {
      // dispatching bot
      console.log("dispatching content generation bot");
      let gptTabId: number;
      const gptTabs = await chrome.tabs.query({
        url: "https://chat.openai.com/chat/*",
      });
      if (gptTabs.length) {
        gptTabId = gptTabs[0].id!;
      } else {
        const newTab = await chrome.tabs.create({
          url: "https://chat.openai.com/chat?model=gpt-4",
          active: true,
        });
        gptTabId = newTab.id!;
      }
      await chrome.storage.local.set({
        contentBot: {
          status: "started",
        } as ContentBotProcess,
      });
      setTimeout(() => {
        chrome.runtime.sendMessage(chrome.runtime.id, "content-status-started");
        contentGenerationBot(gptTabId);
      });
    })();
  } else if (command === STOP_CONTENT_BOT) {
    // stop recall grading
    (async () => {
      const storageValues = await chrome.storage.local.get(["contentBot"]);
      if (storageValues.contentBot.tabId) {
        // removing tab
        try {
          const tab = await chrome.tabs.get(storageValues.contentBot.tabId);
          if (tab.id) {
            // await chrome.tabs.remove(tab.id);
          }
        } catch (e) {}
      }
      await stopContentBot();
    })();
  } else if (command === CONTENT_BOT_STATUS) {
    (async function () {
      const storageValues = await chrome.storage.local.get(["contentBot"]);
      await chrome.runtime.sendMessage(
        chrome.runtime.id,
        "content-status-" + (storageValues.contentBot?.status || "notStarted")
      );
    })();
  }
};
