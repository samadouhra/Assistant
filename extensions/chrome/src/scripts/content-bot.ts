import { reloadGptIfRequired, sendPromptAndReceiveResponse, waitUntilChatGPTLogin } from "../helpers/chatgpt";
import { delay } from "../helpers/common";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, app, auth } from "../lib/firebase";

type ContentBotProcess = {
  status: "notStarted" | "started" | "completed";
  tabId: number;
  gptTabId: number;
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

export const contentGenerationBot = async (
  gptTabId: number
) => {
  // response from participant
  await signInWithEmailAndPassword(
    auth,
    process.env.email || "",
    process.env.password || ""
  );

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

  const nodeTitle = "NODE-TITLE";
  const nodeLinks = [
    [nodeTitle, "p1"],
    ["p1", "p2"],
    ["p2", "p3"]
  ];

  let discoverPrompt: string = `I want to teach you the definition of a "Prerequisite Knowledge Graph". It is a knowledge graph where:\n`;
  discoverPrompt += `- Each node represents a unique piece of knowledge, which we call a concept.\n`;
  discoverPrompt += `- Each node is not divisible into smaller nodes.\n`;
  discoverPrompt += `- The source of each link is called a "parent" and its destination is called a "child".\n`;
  discoverPrompt += `- If node A is a child of node B, then node B is a parent of node A.\n`;
  discoverPrompt += `- Each node can have one or multiple parents and zero, one, or multiple children.\n`;
  discoverPrompt += `- Each link between two nodes represents a direct prerequisite relationship. This means It's impossible for someone to learn a child before learning its parent. By "direct," we mean that if there exists a link from node A to node B, there cannot be any intermediary node C between them that has node A as its parent and node B as its child.\n`;
  discoverPrompt += `- There is no loop in this knowledge graph. This means if node A is a parent of node B and node B is a parent of node C, node C cannot be a parent of node A.\n`;
  discoverPrompt += `- Each node includes a "title" that represents the corresponding concept, and "content" that explains the concept in a short paragraph.\n`;
  discoverPrompt += `- The "title" of each node is very specific. This means to understand what concept the node is representing, one does not need to know its parents or children.\n`;
  
  discoverPrompt += `- Nodes are in three types:\n`;
  discoverPrompt += `  1. A "Concpet" node defines a concept. What we explained above was a Concept node.\n`;
  discoverPrompt += `  2. A "Relation" node is similar to a Concept node, but does not define any new concept, but just explains the relations between two or more concepts.\n`;
  discoverPrompt += `  3. A "Question" node is similar to a Concept node, but contains a multiple-choice question. The title is only the question stem. The content of a Question node should include one or more correct choices. Each choice should start with an alphabetical character and a dot, such as "a.", "b.", "c.", and continue with the word "CORRECT" if the choice is correct, or "WRONG" if the choice is wrong. The next line after each choice should explain the reason for why the choice is correct or wrong. A Question node cannot be a parent of any other node.\n\n`;

  discoverPrompt += `Help me build a knowledge graph, about "${nodeTitle}"\n`;
  for(const nodeLink of nodeLinks) {
    discoverPrompt += `- "${nodeLink[0]}" is a child of ""${nodeLink[1]}"\n`;
  }

  discoverPrompt += "\n";

  discoverPrompt += `I want to expand this knowledge graph. List suggestions for all the children under "${nodeTitle}".\n`;
  discoverPrompt += `Do not write anything other than the list.\n`;
  discoverPrompt += `List as many children as possible and include all the three types of children: Concept, Relation, Question.\n`;
  discoverPrompt += `Start each item in the list with the type of the node, colon, and continue with its title. Do not include any part of a node content. For example, the list should look like the following:\n`;
  discoverPrompt += `- Concept: Lack of User Recognition\n`;
  discoverPrompt += `- Concept: Lack of User Feedback\n`;
  discoverPrompt += `- Relation: Comparison between User Recognition and User Feedback\n`;
  discoverPrompt += `- Question: What motivates users more: recognition or feedback?`;

  const response = await sendPromptAndReceiveResponse(gptTabId, discoverPrompt);
  const discoveredNodes = response.split("\n\n").filter((line: string) => line.indexOf("\n") !== -1).join("").split("\n").map((line: string) => {
    let colonIdx = line.indexOf(":");
    if(colonIdx === -1) return null;
    return {
      nodeType: line.substring(0, colonIdx).trim(),
      title: line.substring(colonIdx + 1).trim()
    }
  });

  console.log(discoveredNodes);

  await delay(1000);
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