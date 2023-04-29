import { getStorage, ref, uploadString } from "firebase/storage";
import { doesReloadRequired, startANewChat } from "../helpers/chatgpt";
import { delay } from "../helpers/common";
import {
  collection,
  getDoc,
  doc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
  startAfter,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, app, auth } from "../lib/firebase";
import { db_1cademy, app_1cademy, auth_1cademy } from "../lib/firebase-1cademy";

type RecallGradeProcess = {
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

const START_RECALL_GRADING = "start-recall-grading";
const STOP_RECALL_GRADING = "stop-recall-grading";
const RECALL_GRADING_STATUS = "recall-grading-status";
const recallGradingCommands = [
  START_RECALL_GRADING,
  STOP_RECALL_GRADING,
  RECALL_GRADING_STATUS,
];
const gptResearcher = "Iman YeckehZaare";

// "http://localhost:5001/visualexp-5d2c6/us-central1/api"
// "https://1cademy.us/api"
const apiBasePath = "https://1cademy.us/api";

export const stopRecallBot = async () => {
  await chrome.storage.local.set({
    recallgrading: {
      status: "notStarted",
    } as RecallGradeProcess,
  });
  await chrome.runtime.sendMessage(
    chrome.runtime.id,
    "recall-status-notStarted"
  );
};

const checkIfGPTHasError = async (gptTabId: number) => {
  const responses = await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId,
    },
    func: () => {
      const btns = document.querySelectorAll("main button");
      const redNotice = document.querySelector(
        "main .border-red-500"
      ) as HTMLElement;
      return (
        String(
          (btns?.[btns.length - 1]?.parentElement as HTMLElement)?.innerText
        ).includes("error") ||
        String(redNotice?.innerText)
          .toLowerCase()
          .includes("reached the current usage")
      );
    },
  });
  return !!responses[0].result;
};

const deleteGPTConversation = async (gptTabId: number) => {
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId,
    },
    func: () => {
      let chats = document.querySelectorAll("nav > div > div > a.group");
      if (!chats.length) return;
      const deleteIcon = chats[0].querySelector(
        'path[d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"]'
      );
      if (!deleteIcon) return;
      const deleteBtn = deleteIcon.closest("button");
      if (!deleteBtn) return;
      deleteBtn.click();

      setTimeout(() => {
        chats = document.querySelectorAll("nav > div > div > a.group");
        const confirmIcon = chats[0].querySelector(
          'polyline[points="20 6 9 17 4 12"]'
        );
        if (!confirmIcon) return;
        const confirmBtn = confirmIcon.closest("button");
        if (!confirmBtn) return;
        confirmBtn.click();
      }, 1000);
    },
  });
  await delay(5000);
};

const reloadGptIfRequired = async (gptTabId: number) => {
  const reloadRequired = await doesReloadRequired(gptTabId);
  if (reloadRequired) {
    const chatgpt = await chrome.tabs.get(gptTabId);
    await chrome.tabs.update(gptTabId, { url: chatgpt.url }); // reloading tab
  }
};

const waitUntilChatGPTLogin = (gptTabId: number) => {
  return new Promise((resolve, reject) => {
    const checker = (n: number = 0) => {
      chrome.scripting
        .executeScript<any, boolean>({
          target: {
            tabId: gptTabId,
          },
          args: [],
          func: () => {
            return !!Array.from(document.querySelectorAll("a")).filter(
              (anc) => anc.innerText.trim().toLowerCase() === "new chat"
            ).length;
          },
        })
        .then((result) => {
          if (result.length) {
            if (result[0].result) {
              resolve(true);
              return;
            }

            if (n >= 180) {
              reject("Stopped due to memory leak");
              return; // don't run recursion
            }
          }
          setTimeout(() => checker(n + 1), 1000);
        });
    };
    checker();
  });
};

const sendPromptAndReceiveResponse = async (
  gptTabId: number,
  prompt: string
) => {
  console.log("sending a request");
  const responses = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: gptTabId,
    },
    args: [prompt],
    func: (prompt: string) => {
      // input paraphrase text in gpt
      const gptTextInput = document.querySelector("textarea");
      if (!gptTextInput) return false;
      gptTextInput.value = prompt;

      let lastInstanceId: string = "last-instance-" + new Date().getTime();

      const gptInputParent = gptTextInput.parentElement;
      if (!gptInputParent) return false;
      const gptActionBtn = gptInputParent.querySelector("button");
      console.log(":: ::gptActionBtn :: :: ", gptActionBtn);
      if (!gptActionBtn) return false;
      gptActionBtn.disabled = false;
      gptActionBtn.removeAttribute("disabled");
      gptActionBtn.click();

      const pInstances = document.querySelectorAll("p");
      const oldLastInstance: any =
        pInstances.length > 1
          ? pInstances[pInstances.length - 2]
          : pInstances?.[1];

      if (oldLastInstance) {
        oldLastInstance.setAttribute("id", lastInstanceId);
      }

      return lastInstanceId;
    },
  });

  let oldLastInstanceId: string = responses?.[0].result || "";
  let lastInstanceId: string = oldLastInstanceId;

  const checker = async (n: number = 0, killOnGeneration: boolean) => {
    const responses = await chrome.scripting.executeScript<any, any>({
      target: {
        tabId: gptTabId,
      },
      args: [killOnGeneration, lastInstanceId, oldLastInstanceId, n],
      func: (
        killOnGeneration: string,
        lastInstanceId: string,
        oldLastInstanceId: string,
        n: number
      ) => {
        const pInstances = document.querySelectorAll("p");
        const lastInstance: any =
          pInstances.length > 1
            ? pInstances[pInstances.length - 2]
            : pInstances?.[1];

        if (lastInstance && !lastInstance.getAttribute("id")) {
          lastInstanceId = "last-instance-" + new Date().getTime();
          lastInstance.setAttribute("id", lastInstanceId);
        }

        const buttons = document.querySelectorAll("form button");
        if (
          buttons.length &&
          (buttons[0] as HTMLElement).innerText.trim() !== ""
        ) {
          // removing html from button content to extract text
          const el = document.createElement("div");
          el.innerHTML = buttons[0].innerHTML;

          const buttonTitle = el.innerText.trim();
          const cond = killOnGeneration
            ? buttonTitle === "Stop generating" ||
              buttonTitle === "Regenerate response"
            : buttonTitle !== "Stop generating" && buttonTitle !== "···";
          if (cond) {
            return true;
          }

          // checking memory leak
          if (n >= 300) {
            return false; // don't run recursion
          }
          // this condition will help for faster plan if stop generation doesn't show up
        } else if (n >= 25) {
          const pInstances = document.querySelectorAll("p");
          const _lastInstance: any =
            pInstances.length > 1
              ? pInstances[pInstances.length - 2]
              : pInstances?.[1];
          const _lastInstanceId = _lastInstance
            ? _lastInstance.getAttribute("id")
            : "";
          console.log("Not saw generation", killOnGeneration, {
            lastInstanceId,
            _lastInstanceId,
          });
          if (
            lastInstanceId !== _lastInstanceId ||
            oldLastInstanceId !== _lastInstanceId
          ) {
            return true;
          } else {
            return false;
          }
        } else {
          return lastInstanceId;
        }
      },
    });
    if (responses?.[0]?.result === true) {
      return true;
    } else if (responses?.[0]?.result === false) {
      return false;
    } else if (typeof responses?.[0]?.result === "string") {
      lastInstanceId = responses?.[0]?.result;
    }
    await delay(1000);
    await checker(n + 1, killOnGeneration);
  };

  // console.log("reached at prompt response -1");

  await checker(0, true);
  // console.log("reached at prompt response 0");
  await checker(0, false);

  // console.log("reached at prompt response");
  const gptResponses = await chrome.scripting.executeScript<any, any>({
    target: {
      tabId: gptTabId,
    },
    args: [],
    func: () => {
      const gptParagraphs = document.querySelectorAll("p");
      console.log(gptParagraphs, "gptParagraphs");
      if (gptParagraphs.length > 1) {
        const lastChatItem = gptParagraphs[gptParagraphs.length - 2];
        if (lastChatItem) {
          // i did this because, it was sometimes giving more than one paragraphs in answer
          const el = lastChatItem.parentElement || lastChatItem;
          if (el) {
            console.log("el - response", el);
            return el.innerText.trim();
          }
        }
      }
      console.log("sending empty response");
      // return empty string if there was not result
      return "";
    },
  });

  // console.log("reached at prompt response 2", gptResponses);

  return gptResponses?.[0]?.result || "";
};

const getRecallGrades = async (
  recallGradeDoc: QueryDocumentSnapshot<DocumentData>
) => {
  let _recallGrades: any = [];

  const recallGrade = recallGradeDoc.data();
  let selectedByOther = false;
  const botId = await getBotId();

  for (let session in recallGrade.sessions) {
    for (let conditionItem of recallGrade.sessions[session]) {
      if (conditionItem.botId && conditionItem.botId !== botId) {
        selectedByOther = true;
      }
    }
  }

  if (selectedByOther) return [];

  for (let session in recallGrade.sessions) {
    for (let conditionItem of recallGrade.sessions[session]) {
      if (
        !conditionItem.hasOwnProperty("doneGPT4Mentioned") ||
        !conditionItem.doneGPT4Mentioned
      ) {
        _recallGrades.push({
          docId: recallGradeDoc.id,
          session: session,
          numSessions: Object.keys(recallGrade.sessions).length,
          conditionIndex: recallGrade.sessions[session].indexOf(conditionItem),
          user: recallGrade.user,
          project: recallGrade.project,
          ...conditionItem,
        });
      }
    }
  }

  // only do process recalls that are done
  _recallGrades = _recallGrades.filter((recall: any) => !recall.botId);

  let __recallGrades = _recallGrades.filter((g: any) => g.numSessions !== 2);
  __recallGrades.sort((g1: any, g2: any) =>
    g1.researchers.length > g2.researchers.length ? -1 : 1
  );

  return [
    ..._recallGrades.filter((g: any) => g.numSessions === 2),
    ...__recallGrades,
  ];
};

const getBotId = async () => {
  const storagedActions = await chrome.storage.local.get(["botId"]);
  if (storagedActions?.botId) {
    return storagedActions?.botId;
  }
  const botId = String(new Date().getTime());
  await chrome.storage.local.set({
    botId,
  });

  return botId;
};

const getNextRecallGrades = async (
  prevRecallGrade?: QueryDocumentSnapshot<DocumentData>
): Promise<QueryDocumentSnapshot<DocumentData> | null> => {
  console.log("getNextRecallGrades", prevRecallGrade ? prevRecallGrade.id : "");
  // priority 3 = researchers major vote excluding iman greater than or equal 3
  // priority 2 = Satisfied = false
  // priority 1 = Records for users whose 3rd session is not passed yet
  // priority 0 = default

  let recallGrades = await getDocs(
    prevRecallGrade
      ? query(
          collection(db, "recallGradesV2"),
          orderBy("priority", "desc"),
          limit(1),
          startAfter(prevRecallGrade)
        )
      : query(
          collection(db, "recallGradesV2"),
          orderBy("priority", "desc"),
          limit(1)
        )
  );

  if (recallGrades.docs.length) {
    let isValid = true;
    // await delay(1000 * (Math.random() * 7) + 4);
    const recallGrade = await getDoc(
      doc(db, "recallGradesV2", recallGrades.docs[0].id)
    );

    const _recallGrades = await getRecallGrades(
      recallGrade as QueryDocumentSnapshot<DocumentData>
    );
    if (!_recallGrades.length) {
      isValid = false;
    } else {
      // flag condition item by bot id
      const { session, conditionIndex } = _recallGrades[0];
      const recallGradeData = recallGrade.data()!;
      recallGradeData.sessions[session][conditionIndex].botId =
        await getBotId();
      await updateDoc(doc(db, "recallGradesV2", recallGrade.id), {
        sessions: recallGradeData.sessions,
      });
    }

    if (!isValid) {
      return getNextRecallGrades(recallGrades.docs[0]);
    }

    return recallGrades.docs[0];
  }

  return null;
};

type ResponseLineTypeReturn = "boolean" | "percentage" | "reason";

const responseLineType = (line: string): ResponseLineTypeReturn => {
  const _line = line.trim();
  if (
    _line.toLowerCase().replace(/[^a-z]+/g, "") === "no" ||
    _line.toLowerCase().replace(/[^a-z]+/g, "") === "yes"
  ) {
    return "boolean";
  } else if (_line.charAt(_line.length - 1) === "%") {
    return "percentage";
  }
  return "reason";
};

const updateRecallGrades = async (recallGrade: any) => {
  const recallGradeRef = doc(db, "recallGradesV2", recallGrade.docId);
  let allPhrasesDone = true;
  for (const phrase of recallGrade.phrases) {
    if (!phrase.hasOwnProperty("GPT-4-Mentioned")) {
      allPhrasesDone = false;
      break;
    }
  }
  const recallGradeDoc = await getDoc(recallGradeRef);
  let recallGradeUpdate: any = recallGradeDoc.data();
  recallGradeUpdate.sessions[recallGrade.session][
    recallGrade.conditionIndex
  ].phrases = recallGrade.phrases;
  recallGradeUpdate.sessions[recallGrade.session][
    recallGrade.conditionIndex
  ].doneGPT4Mentioned = allPhrasesDone;
  await updateDoc(recallGradeRef, recallGradeUpdate);
};

const chatGPTPrompt: any = async (
  nodeTitle: string,
  nodeContent: string,
  gptTabId: any,
  excludingQuestions: string[]
) => {
  let discoverPrompt: string = `Please compose a multiple-choice question based on the provided text block enclosed in triple quotes. The output should be formatted as a JSON object and consist of the following components:\n`;
  discoverPrompt += `- "Stem": This field will contain the central question.\n`;
  discoverPrompt += `- "Choices": This will be an array of potential answers. Each answer is an individual object, featuring:\n`;
  discoverPrompt += `- "choice": The text of the choice, starting with a lowercase letter followed by a period, like "a.", "b.",  "c." ...\n`;
  discoverPrompt += `- "correct": This field should state either "true" if the choice is the right answer, or "false"  if it isn't it should be boolean.\n`;
  discoverPrompt += `- "feedback": An explanation describing why the given choice is either correct or incorrect.\n`;
  discoverPrompt += `Remember to follow JSON syntax rules to ensure proper formatting.\n`;
  if(excludingQuestions.length) {
    discoverPrompt += `Note that  following questions are already added. Don't create them again:\n`;
    for(const excludingQuestion of excludingQuestions) {
      discoverPrompt += `- ${excludingQuestion}\n`;
    }
  }

  discoverPrompt += `'''\n`;
  discoverPrompt += `${nodeTitle}:\n`;
  discoverPrompt += `"${nodeContent}"\n`;
  discoverPrompt += `'''\n`;

  const response: string = await sendPromptAndReceiveResponse(
    gptTabId,
    discoverPrompt
  );
  try {
    const startBracket = response.indexOf("{");
    if (startBracket === -1) {
      throw new Error(`JSON not found`);
    }
    let endBracket = response.indexOf("}");
    while (response.indexOf("}", endBracket + 1) !== -1) {
      endBracket = response.indexOf("}", endBracket + 1);
    }
    if (endBracket === -1) {
      throw new Error(`JSON not found`);
    }
    let jsonStr = response.substring(startBracket, endBracket + 1);
    jsonStr = jsonStr.replace(/\\/g, "~~~~");
    let question = JSON.parse(jsonStr);
    for(const Choice of question.Choices) {
      Choice.choice = Choice.choice.replace(/~~~~/g, "\\");
      Choice.feedback = Choice.feedback.replace(/~~~~/g, "\\");
    }
    console.log(question);
    return question;
  } catch (err) {
    console.log(err, "ERROR");
    return await chatGPTPrompt(nodeTitle, nodeContent, gptTabId, excludingQuestions);
  }
};

const proposeChildNode: any = async (accessToken: any, payload: any) => {
  const apiResponse = await fetch(
    process.env.ONECADEMY_API_URL + "/api/proposeChildNode",
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

let nodeByIdMap: {
  [nodeId: string]: INode;
} = {};

const dfs = async (
  nodeId: string,
  gptTabId: any,
  accessToken: any,
  userData: any,
  nodeProcessed: {n: number}
) => {
  const storageValues = await chrome.storage.local.get(["recallgrading"]);
  if (storageValues?.recallgrading?.status === "notStarted") {
    await stopRecallBot();
    return;
  }
  
  if(nodeProcessed.n >= 50){
    return;
  }
  
  if (nodeByIdMap[nodeId]) {
    return;
  }

  const nodeRef = doc(db_1cademy, "nodes", nodeId);
  let node = await getDoc(nodeRef);
  nodeByIdMap[node.id] = node.data() as INode;
  console.log(`${nodeId} -> ${nodeByIdMap[node.id].title}`);
  const nodeType = nodeByIdMap[node.id].nodeType;
  const tagIds = nodeByIdMap[node.id].tagIds;
  const tags = nodeByIdMap[node.id].tags;

  if(!tagIds.includes(process.env.ONECADEMY_NODE_TAG_ID!)) {
    return;
  }

  let totalQuestionNodes = nodeByIdMap[node.id].children.filter(
    (childNode: any) => childNode.type === "Question"
  ).length;
  if (
    (nodeType === "Concept" || nodeType === "Relation") &&
    totalQuestionNodes < 4
  ) {
    const nodeTitle = nodeByIdMap[node.id].title;
    const nodeContent = nodeByIdMap[node.id].content;
    const excludingQuestions: string[] = nodeByIdMap[node.id].children.filter(
      (childNode: any) => childNode.type === "Question"
    ).map((childNode: any) => childNode.title);
    let i = 0;
    const discoveredNode = await chatGPTPrompt(
      nodeTitle,
      nodeContent,
      gptTabId,
      excludingQuestions
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
        nodeImage: "",
        nodeVideo: "",
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
        notebookId: "BuTGsO8zzj6CD9AYjGnN" // "uCxQLVQtn8dqxpd2SKG9",//
      },
    };
    await proposeChildNode(accessToken, payload);
    nodeProcessed.n++;
    await delay(1000);
  }
  
  for (const child of nodeByIdMap[node.id].children) {
    await dfs(child.node, gptTabId, accessToken, userData, nodeProcessed);
  }
};

export const recallGradingBot = async (
  gptTabId: number,
  prevRecallGrade?: QueryDocumentSnapshot<DocumentData>
) => {
  const startId: any = process.env.ONECADEMY_NODE_START_ID;
  // response from participant
  await signInWithEmailAndPassword(
    auth,
    process.env.email || "",
    process.env.password || ""
  );

  const userCredential = await signInWithEmailAndPassword(
    auth_1cademy,
    process.env.ONECADEMY_EMAIL || "",
    process.env.ONECADEMY_PASSWORD || ""
  );

  const usersRef = collection(db_1cademy, "users");
  const q = query(
    usersRef,
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

  prevRecallGrade = (await getNextRecallGrades(prevRecallGrade))!;
  // console.log(prevRecallGrade, "prevRecallGrade")
  if (!prevRecallGrade) return; // bot is done processing

  let recallGrades = await getRecallGrades(prevRecallGrade);

  console.log("::: ::: recallGrades after ordering ::: :::: ", recallGrades);

  // focusing gpt tab

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

  for (let recallGrade of recallGrades) {
    let isChatStarted = await startANewChat(gptTabId, "GPT4");
    while (!isChatStarted) {
      console.log("Waiting for 10 min for chatGPT to return. (start)");
      // await delay(10 * 60 * 1000); // 10 minutes
      let nodeProcessed = {n: 0};
      await startANewChat(gptTabId, "GPT35");
      const accessToken = await userCredential.user.getIdToken(false);
      console.log(startId, "startId")
      await dfs(startId, gptTabId, accessToken, userData, nodeProcessed);
      nodeByIdMap = {};
      const chatgpt = await chrome.tabs.get(gptTabId);
      await chrome.tabs.update(gptTabId, { url: chatgpt.url }); // reloading tab
      isChatStarted = await startANewChat(gptTabId, "GPT4");
    }

    const storageValues = await chrome.storage.local.get(["recallgrading"]);
    // if someone closed one of these tabs between bot running
    if (storageValues?.recallgrading?.status === "notStarted") {
      await stopRecallBot();
      return;
    }
    const passageDoc = await getDoc(doc(db, "passages", recallGrade.passage));
    const passagesTitle = passageDoc.data()?.title;
    await delay(4000);

    for (const phrase of recallGrade.phrases) {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      // if someone closed one of these tabs between bot running
      if (storageValues?.recallgrading?.status === "notStarted") {
        await stopRecallBot();
        return;
      }

      const researcherIdx = phrase.researchers.indexOf(gptResearcher);
      let otherResearchers = phrase.researchers.slice();
      if (researcherIdx !== -1) {
        otherResearchers.splice(researcherIdx, 1);
      }
      if (
        !phrase.hasOwnProperty("GPT-4-Mentioned") &&
        phrase.satisfied &&
        otherResearchers.length <= 2
      ) {
        let isError = true;
        while (isError) {
          const prompt =
            `A student has written the following triple-quoted answer to a question about "${passagesTitle}".` +
            (recallGrade.passage === "6rc4k1su3txN6ZK4CJ0h"
              ? ` Everywhere it mentions "vertical" (vertically), it mean "elevation" and vice versa. Everywhere it mentions "horizontal" (horizontally), it mean "azimuth" and vice versa.`
              : ``) +
            `\n` +
            `'''\n${recallGrade.response}\n'''\n` +
            `Does the student mention the key phrase "${phrase.phrase}" in their answer?\n` +
            `Only respond YES or NO, in caps, without any explanations.`;

          const response = await sendPromptAndReceiveResponse(gptTabId, prompt);
          isError = await checkIfGPTHasError(gptTabId);

          if (isError) {
            const chatgpt = await chrome.tabs.get(gptTabId);
            await chrome.tabs.update(gptTabId, { url: chatgpt.url }); // reloading tab
            console.log("Waiting for 10 min for chatGPT to return. (phrase)");
            let nodeProcessed = {n: 0};
            await startANewChat(gptTabId, "GPT35");
            const accessToken = await userCredential.user.getIdToken(false);
            console.log(startId, "startId")
            await dfs(startId, gptTabId, accessToken, userData, nodeProcessed);
            nodeByIdMap = {};
            // await delay(1000 * 60 * 10);
            const isChatAvailable = await waitUntilChatGPTLogin(gptTabId);
            if (!isChatAvailable) {
              throw new Error("ChatGPT is not available.");
            }
            continue;
          }
          console.log("response", response);
          phrase["GPT-4-Mentioned"] =
            response.trim().slice(0, 3).toLowerCase() === "yes"
              ? true
              : response.trim().slice(0, 2).toLowerCase() === "no"
              ? false
              : null;
        }

        await deleteGPTConversation(gptTabId);
        let isChatStarted = await startANewChat(gptTabId, "GPT4");
        while (!isChatStarted) {
          console.log("Waiting for 10 min for chatGPT to return. (end)");
          let nodeProcessed = {n: 0};
          await startANewChat(gptTabId, "GPT35");
          const accessToken = await userCredential.user.getIdToken(false);
          console.log(startId, "startId")
          await dfs(startId, gptTabId, accessToken, userData, nodeProcessed);
          nodeByIdMap = {};
          // await delay(10 * 60 * 1000); // 10 minutes
          const chatgpt = await chrome.tabs.get(gptTabId);
          await chrome.tabs.update(gptTabId, { url: chatgpt.url }); // reloading tab
          isChatStarted = await startANewChat(gptTabId, "GPT4");
        }

        if (phrase["GPT-4-Mentioned"] !== null) {
          await updateRecallGrades(recallGrade);
          console.log("writing recall phrase", phrase, recallGrade.docId);
        }
      }
    }
  }

  recallGradingBot(gptTabId, prevRecallGrade);
};

export const recallGradeListener = (
  command: string,
  context: chrome.runtime.MessageSender
) => {
  if (
    context.id !== chrome.runtime.id ||
    !recallGradingCommands.includes(command)
  ) {
    return;
  }

  if (command === START_RECALL_GRADING) {
    // start recall grading
    (async () => {
      // dispatching bot
      console.log("dispatching recall grading bot");
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
        recallgrading: {
          status: "started",
        } as RecallGradeProcess,
      });
      setTimeout(() => {
        chrome.runtime.sendMessage(chrome.runtime.id, "recall-status-started");
        recallGradingBot(gptTabId);
      });
    })();
  } else if (command === STOP_RECALL_GRADING) {
    // stop recall grading
    (async () => {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      if (storageValues.recallgrading.tabId) {
        // removing tab
        try {
          const tab = await chrome.tabs.get(storageValues.recallgrading.tabId);
          if (tab.id) {
            // await chrome.tabs.remove(tab.id);
          }
        } catch (e) {}
      }
      await stopRecallBot();
    })();
  } else if (command === RECALL_GRADING_STATUS) {
    (async function () {
      const storageValues = await chrome.storage.local.get(["recallgrading"]);
      await chrome.runtime.sendMessage(
        chrome.runtime.id,
        "recall-status-" + (storageValues.recallgrading?.status || "notStarted")
      );
    })();
  }
};
