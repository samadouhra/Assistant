import React, { useEffect, useRef, useState } from "react";

type Theme = {
  mode: "dark" | "light";
};

export const useTheme = () => {
  const [mode, setMode] = useState<Theme>({ mode: "light" });
  useEffect(() => {
    const body = document.querySelector("body");
    if (!body) return;
    
    body.classList.contains("dark-mode")
    ? setMode({ mode: "dark" })
    : setMode({ mode: "light" });

    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName !== "class") return;
        body.classList.contains("dark-mode")
          ? setMode({ mode: "dark" })
          : setMode({ mode: "light" });
      });
    });
    bodyObserver.observe(body,{attributes:true})

    return ()=>bodyObserver.disconnect()
  }, []);

  return mode;
};
