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

export const startANewChat = async (gptTabId: number, type: "GPT35" | "GPT4") => {
  if(type === "GPT4") {
    return false;
  }
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

  // if(type === "GPT4") {
  //   await delay(500);
  //   await chrome.scripting.executeScript({
  //     target: {
  //       tabId: gptTabId,
  //     },
  //     func: () => {
  //       const modelDropDown = document.querySelector(
  //         'button[id^="headlessui-listbox-button-"]'
  //       ) as HTMLElement;
  //       if (!modelDropDown) return;
  //       modelDropDown.click();
  //     },
  //   });
  //   await delay(500);
  //   // check if gpt4 is available or not
  //   const availability_responses = await chrome.scripting.executeScript({
  //     target: {
  //       tabId: gptTabId,
  //     },
  //     func: () => {
  //       const gpt4DisableIcon = document.querySelector(
  //         'li[id^="headlessui-listbox-option-"] path[d="M11.412 15.655L9.75 21.75l3.745-4.012M9.257 13.5H3.75l2.659-2.849m2.048-2.194L14.25 2.25 12 10.5h8.25l-4.707 5.043M8.457 8.457L3 3m5.457 5.457l7.086 7.086m0 0L21 21"]'
  //       );
  //       if (gpt4DisableIcon) {
  //         return false;
  //       }
  //       return true;
  //     },
  //   });
  //   if (!availability_responses?.[0]?.result) {
  //     return false;
  //   }

  //   const gpt4Selection_responses = await chrome.scripting.executeScript({
  //     target: {
  //       tabId: gptTabId,
  //     },
  //     func: () => {
  //       const dropdownOptions = document.querySelectorAll(
  //         'li[id^="headlessui-listbox-option-"]'
  //       );
  //       if (!dropdownOptions.length) return false;
  //       const labels = Array.from(dropdownOptions)
  //         .map((list_item) => (list_item as HTMLElement).innerText.trim())
  //         .map((label: string) => label.toLowerCase().replace(/[^a-z0-9]/g, ""));
  //       const gpt4Idx = labels.indexOf("gpt4");
  //       if (gpt4Idx === -1) {
  //         return false;
  //       }
  //       const dropdownOption = dropdownOptions[gpt4Idx] as HTMLElement;
  //       dropdownOption.click();

  //       return true;
  //     },
  //   });
  //   if (!gpt4Selection_responses?.[0]?.result) {
  //     return false;
  //   }
  // }

  return true;
};