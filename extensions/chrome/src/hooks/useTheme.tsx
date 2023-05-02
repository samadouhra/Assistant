import React, { useEffect, useRef, useState } from 'react'

type Theme={
    mode:"dark"|"light"
}

export const useTheme = () => {

    const [mode, setMode] = useState<Theme>({mode:"light"});
    useEffect(()=>{
        const body=document.querySelector('body');
        if(!body) return ;

        const computedStyles=window.getComputedStyle(body);
        const bgColor=computedStyles.backgroundColor
        const color=computedStyles.color;
        const isDark=isDarkColor(bgColor)
        const isColorDark=isDarkColor(color)
        isDark ? setMode({mode:"dark"}) : setMode({mode:"light"})
        
    },[])

    return mode
}
const isDarkColor=(color:string)=>{
    const matches=color.match(/rgb\((\d+), (\d+), (\d+)\)/);
    if(!matches) return false;
    const [,r,g,b]=matches.map(Number);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance < 0.5 


}