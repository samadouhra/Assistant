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