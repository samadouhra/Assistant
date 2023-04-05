import { delay } from "./common";

export const doesReloadRequired = async (tabId: number) => {
  try {
    const response = await fetch("https://chat.openai.com/");
    if(response.status !== 200) return true;
    return false;
  } catch(e) {}

  return true;
}

export const fetchClientInfo = async () => {
  return (await (await fetch("https://www.cloudflare.com/cdn-cgi/trace")).text()).split("\n").filter((p) => p).reduce((c: any, d) => {
    const _ps = d.split("=")
    const paramName = _ps.shift() as string;
    const paramValue = _ps.join("=");
    return {...c, [paramName]: paramValue};
  }, {});
}


export const sendPromptAndReceiveResponse = async (
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
      if (!gptActionBtn) return false;
      gptActionBtn.disabled = false;
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

  await checker(0, true);
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
            // console.log("el - response", el);
            return el.innerText.trim();
          }
        }
      }
      console.log("sending empty response");
      // return empty string if there was not result
      return "";
    },
  });

  return gptResponses?.[0]?.result || "";
};

export const deleteLastGPTConversation = async (gptTabId: number) => {
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
    },
  });
  await delay(1000);
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId,
    },
    func: () => {
      const chats = document.querySelectorAll("nav > div > div > a.group");
      const confirmIcon = chats[0].querySelector(
        'polyline[points="20 6 9 17 4 12"]'
      );
      if (!confirmIcon) return;
      const confirmBtn = confirmIcon.closest("button");
      if (!confirmBtn) return;
      confirmBtn.click();
    },
  });
  await delay(2000);
};

export const checkIfGPTHasError = async (gptTabId: number) => {
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

export const reloadGptIfRequired = async (gptTabId: number) => {
  const reloadRequired = await doesReloadRequired(gptTabId);
  if (reloadRequired) {
    const chatgpt = await chrome.tabs.get(gptTabId);
    await chrome.tabs.update(gptTabId, { url: chatgpt.url }); // reloading tab
  }
};

export const waitUntilChatGPTLogin = (gptTabId: number) => {
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

export const startANewChat = async (gptTabId: number, type: "GPT35" | "GPT4") => {
  await chrome.scripting.executeScript({
    target: {
      tabId: gptTabId,
    },
    func: () => {
      const newChatBtn = document.querySelector("nav > a") as HTMLElement;
      if (!newChatBtn) return;
      newChatBtn.click();
    },
  });

  if(type === "GPT4") {
    await delay(500);
    await chrome.scripting.executeScript({
      target: {
        tabId: gptTabId,
      },
      func: () => {
        const modelDropDown = document.querySelector(
          'button[id^="headlessui-listbox-button-"]'
        ) as HTMLElement;
        if (!modelDropDown) return;
        modelDropDown.click();
      },
    });
    await delay(500);
    // check if gpt4 is available or not
    const availability_responses = await chrome.scripting.executeScript({
      target: {
        tabId: gptTabId,
      },
      func: () => {
        const gpt4DisableIcon = document.querySelector(
          'li[id^="headlessui-listbox-option-"] path[d="M11.412 15.655L9.75 21.75l3.745-4.012M9.257 13.5H3.75l2.659-2.849m2.048-2.194L14.25 2.25 12 10.5h8.25l-4.707 5.043M8.457 8.457L3 3m5.457 5.457l7.086 7.086m0 0L21 21"]'
        );
        if (gpt4DisableIcon) {
          return false;
        }
        return true;
      },
    });
    if (!availability_responses?.[0]?.result) {
      return false;
    }
    await chrome.scripting.executeScript({
      target: {
        tabId: gptTabId,
      },
      func: () => {
        const dropdownOptions = document.querySelectorAll(
          'li[id^="headlessui-listbox-option-"]'
        );
        if (!dropdownOptions.length) return;
        const dropdownOption = dropdownOptions[
          dropdownOptions.length - 1
        ] as HTMLElement;
        dropdownOption.click();
      },
    });
  }

  return true;
};