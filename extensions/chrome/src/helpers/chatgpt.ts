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