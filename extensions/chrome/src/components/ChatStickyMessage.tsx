import { Box, Typography } from '@mui/material'
import React from 'react'
import { useTheme } from '../hooks/useTheme';
import { DESIGN_SYSTEM_COLORS } from '../utils/colors';

export const ChatStickyMessage = () => {

    const { mode } = useTheme();

    return (
        <Box
            sx={{
                width: "100%",
                height: "38px",
                p: "10px 24px",
                display: "grid",
                placeItems: "center",
                borderBottom: `solid 1px ${mode === "light"
                    ? DESIGN_SYSTEM_COLORS.gray300
                    : DESIGN_SYSTEM_COLORS.notebookG500
                    }`,
            }}
        >
            <Typography
                sx={{
                    color:
                        mode === "light"
                            ? DESIGN_SYSTEM_COLORS.gray500
                            : DESIGN_SYSTEM_COLORS.gray50,
                    fontSize: "12px",
                }}
            >
                This conversation is recorded and can be viewable by instructors
            </Typography>
        </Box>
    )
}
