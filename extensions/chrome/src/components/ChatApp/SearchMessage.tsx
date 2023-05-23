import { Box, Stack, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { RiveComponentMemoized } from "./RiveMemoized";
import { useTheme } from "../../hooks/useTheme";
import { DESIGN_SYSTEM_COLORS } from "../../utils/colors";
import { LOGO_URL, SEARCH_ANIMATION_LOADER, SEARCH_ANIMATION_URL } from "../../utils/constants";
import { CustomAvatar } from "./CustomAvatar";
import { getCurrentDateYYMMDD } from "../../utils/date";

const SearchMessage = () => {
  const { mode } = useTheme();

  const [loaderIdx, setLoaderIdx] = useState<number>(0);
  useEffect(() => {
    setInterval(() => {
      setLoaderIdx((prev) => {
        return (prev+1) % (SEARCH_ANIMATION_LOADER.length - 1);
      });
    }, 10000);
  }, []);
  
  const now=new Date()
  
  return (
    <Box
      display={"grid"}
      sx={{
        maxWidth: "250px",
        gridTemplateColumns: "40px 1fr",
        columnGap: "12px",
        alignItems:"center"
      }}
    >
      <CustomAvatar imageUrl={LOGO_URL} alt="onecademy assistant logo" />
      <Stack direction={"row"} justifyContent={"space-between"}>
        <Typography
          sx={{
            fontWeight: 500,
            fontSize: "14px",
            color:
              mode === "dark"
                ? DESIGN_SYSTEM_COLORS.gray25
                : DESIGN_SYSTEM_COLORS.gray900,
          }}
        >
          1Cademy Assistant
        </Typography>
        
      </Stack>
      <Box
        sx={{
          gridRowStart:2,
          gridColumnStart: 2,
          p: "10px 14px",
          borderRadius: "0px 8px 8px 8px",
          backgroundColor:
            mode === "light"
              ? DESIGN_SYSTEM_COLORS.gray200
              : DESIGN_SYSTEM_COLORS.notebookG600,
        }}
      >
        <Box
          sx={{
            width: "70px",
            height: "70px",
            mx: "auto",
          }}
        >
          {loaderIdx === 0 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}
          {loaderIdx === 1 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}

          {loaderIdx === 2 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}

          {loaderIdx === 3 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}

          {loaderIdx === 4 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}

          {loaderIdx === 5 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}

          {loaderIdx === 6 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}

          {loaderIdx === 7 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}

          {loaderIdx === 8 && (
            <RiveComponentMemoized
              src={SEARCH_ANIMATION_LOADER[loaderIdx]}
              artboard="New Artboard"
              animations={["Timeline 1",mode]}
              autoplay={true}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SearchMessage;
