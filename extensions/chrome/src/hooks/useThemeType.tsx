import { useEffect, useState } from "react";

export type ThemeType = "dark" | "light";

export const useThemeType = () => {
  const [themeType, setThemeType] = useState<ThemeType>("light");
  useEffect(() => {
    const body = document.querySelector("body");
    if (!body) return;
    
    body.classList.contains("dark-mode")
    ? setThemeType("dark")
    : setThemeType("light");

    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName !== "class") return;
        body.classList.contains("dark-mode")
          ? setThemeType("dark")
          : setThemeType("light");
      });
    });
    bodyObserver.observe(body,{attributes:true})

    return ()=>bodyObserver.disconnect()
  }, []);

  return themeType;
};
