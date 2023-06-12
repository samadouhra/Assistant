export const ONECADEMY_BASEURL = process.env.ONECADEMY_BASEURL;
export const LOGO_URL = 'https://firebasestorage.googleapis.com/v0/b/onecademy-dev.appspot.com/o/tmp%2F1cademy-assistant.svg?alt=media&token=88d6e1c9-59e0-4deb-87b5-afc563b5a676'
export const SEARCH_ANIMATION_URL = "https://firebasestorage.googleapis.com/v0/b/onecademy-dev.appspot.com/o/tmp%2Fbot-search.riv?alt=media&token=d9df50ac-3218-4273-9a9b-ea5576f4d881"
export const SEARCH_ANIMATION_LOADER: { text: string, url: string }[] = [
  { text: "Sending your question", url: chrome.runtime.getURL('rive-assistant/loader/1.riv') },
  { text: "Searching for other nodes in the 1Cademy database...", url: chrome.runtime.getURL('rive-assistant/loader/2-4-9.riv') },
  { text: "Extracting nodes from the final response...", url: chrome.runtime.getURL('rive-assistant/loader/3.riv') },
  { text: "I'm searching for nodes in my brain knowledge graph to answer your question.", url: chrome.runtime.getURL('rive-assistant/loader/2-4-9.riv') },
  { text: "Sending information about nodes...", url: chrome.runtime.getURL('rive-assistant/loader/5.riv') },
  { text: "", url: chrome.runtime.getURL('rive-assistant/loader/6.riv') },
  { text: "Providing title, content, and other information about nodes...", url: chrome.runtime.getURL('rive-assistant/loader/7.riv') },
  { text: "Generation of final response...", url: chrome.runtime.getURL('rive-assistant/loader/8.riv') },
  { text: "", url: chrome.runtime.getURL('rive-assistant/loader/2-4-9.riv') }
];
export const CHAT_BACKGROUND_IMAGE_URL = "https://firebasestorage.googleapis.com/v0/b/onecademy-dev.appspot.com/o/tmp%2F000111-01.svg?alt=media&token=f529cbcf-cee2-4e91-896e-7f867f26973d"
export const ENDPOINT_BASE = `${ONECADEMY_BASEURL}/api`
export const NOTEBOOKS_LINK = `${ONECADEMY_BASEURL}/notebooks/notebook%202`
export const NOTEBOOK_LINK = `${ONECADEMY_BASEURL}/notebook`
export const ASSISTANT_NAME = "1Cademy Assistant"
export const ONECADEMY_IFRAME_URL = `${ONECADEMY_BASEURL}/iframe`;
export const USER_NAME = `You`;


const TAG_ID: string = "HjIukJr12fIP9DNoD9gX";