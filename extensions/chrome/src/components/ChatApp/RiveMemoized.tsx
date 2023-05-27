import { useRive } from "@rive-app/react-canvas";
import React from "react";


export type RiveProps = {
  src: string;
  artboard: string;
  animations: string | string[];
  autoplay: boolean;
  inView?: boolean;
};

const RiveMemoized = ({ src, artboard, animations, autoplay }: RiveProps) => {
  const { RiveComponent } = useRive({
    src,
    artboard,
    animations,
    autoplay,
  });

  return <RiveComponent style={{width:"70px",height:"70px"}}/>;
};
export const RiveComponentMemoized = React.memo(RiveMemoized);
