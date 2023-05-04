import { Box, Button, Typography } from '@mui/material'
import React from 'react'
import { useTheme } from '../hooks/useTheme'
import { DESIGN_SYSTEM_COLORS } from '../utils/colors'
import { LOGO_URL } from '../utils/constants'
import { CustomAvatar } from './ChatApp/CustomAvatar'

type HeaderMessage = {
    displayClearButton: boolean,
    onClearChat: () => void,
}
export const HeaderMessage = ({ displayClearButton, onClearChat }: HeaderMessage) => {

    const { mode } = useTheme();

    return (
        <Box
            sx={{
                width: "100%",
                height: "80px",
                p: "16px 24px",
                display: "grid",
                alignItems: "center",
                gridTemplateColumns: "48px auto",
                gap: "11px",
                borderBottom: `solid 1px ${mode === "light"
                    ? DESIGN_SYSTEM_COLORS.gray300
                    : DESIGN_SYSTEM_COLORS.notebookG500
                    }`,
            }}
        >
            <CustomAvatar
                imageUrl={LOGO_URL}
                alt="onecademy assistant logo"
                size="lg"
            />
            <Box
                sx={{
                    display: "flex",
                    alignContent: "center",
                    justifyContent: "space-between",
                }}
            >
                <Box>
                    <Typography
                        sx={{
                            fontSize: "18px",
                            color:
                                mode === "dark"
                                    ? DESIGN_SYSTEM_COLORS.gray25
                                    : DESIGN_SYSTEM_COLORS.gray900,
                            fontWeight: 500,
                        }}
                    >
                        1Cademy Assistant
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: "14px",
                            color:
                                mode === "dark"
                                    ? DESIGN_SYSTEM_COLORS.gray100
                                    : DESIGN_SYSTEM_COLORS.gray500,

                            fontWeight: 400,
                        }}
                    >
                        Powered by GPT-4
                        {/* {token ? "T" : ""} {notebookId ? "N" : ""} */}
                    </Typography>
                </Box>
                {displayClearButton && (
                    <Button onClick={onClearChat}>Clear chat</Button>
                )}
            </Box>
        </Box>
    )
}
