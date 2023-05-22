import { delay } from "./common";

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

export type BARD_RESULT_NODE = {
  title: string,
  content: string,
  correct_answers: number
};

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
    commandIdx = response.indexOf("\\1Cademy\\", commandIdx + 1);
    if (commandIdx !== -1) commandIndices.push(commandIdx);
  } while (commandIdx !== -1);

  for (let i = 0; i < commandIndices.length; i++) {
    const startIdx = commandIndices[i];
    // we need boundary to not overlap next command
    const lastEndIdx = response.indexOf("\n", startIdx + 1);
    
    let command = response.substring(startIdx, lastEndIdx + 1);
    command = command
      .replace(/^\\1Cademy\\/, "")
      .replace(/\\$/, "")
      .trim();
    commands.push(command);
  }

  return commands;
};

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

export const getBardAnswerPrompt = (passage: string, nodes: BARD_RESULT_NODE[]) => {
  return `'''\n` +
  passage + `\n` +
  `'''\n` +
  `I am a student. Explain the above selected text (in triple-quotes) ONLY based on the following nodes. For each node, I've specified its title, content, and correct_answers (the number of times I've answered it correctly) in the following JSON object.\n` +
  generateNodesPrompt(nodes) +
  `\n` +
  `Your response should be ONLY a JSON object with your well-explained response to my question and the list of titles of the nodes that you used in your explanation, with the following structure:\n` +
  `{\n` +
  `  "response": "Your well-explained response to my question"\n` +
  `   nodes:\n` +
  `   [\n` +
  `      "The title of the node 1",\n` +
  `      "The title of the node 2",\n` +
  `      "The title of the node 3"\n` +
  `   ]` +
  `}`;
};

export const generateNodesPrompt = (nodes: BARD_RESULT_NODE[]) => {
  let result = `[\n`;
  let nodesList: string[] = [];
  for(const node of nodes) {
    let nodeResult = `  {\n`;
    nodeResult += `    "title": '''${node.title}''',\n`;
    nodeResult += `    "content": '''${node.content}''',\n`;
    nodeResult += `    "correct_answers": ${node.correct_answers}\n`;
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