import React, { useEffect, useRef } from 'react'
import { brandingLightTheme } from '../utils/brandingTheme'
import './ChatApp/styles.css'
import { CustomAvatar } from './ChatApp/CustomAvatar'
import CloseIcon from '@mui/icons-material/Close'
import { getFirestore } from 'firebase/firestore'
import {
  Box,
  Button,
  IconButton,
  ThemeProvider,
  Stack,
  Typography,
  Paper,
  useForkRef,
  Tooltip,
} from '@mui/material'

import { signIn } from '../serveless/auth'
import { useState } from 'react'
import { DESIGN_SYSTEM_COLORS } from '../utils/colors'
import { Chat } from './ChatApp/Chat'
import { LOGO_URL, NOTEBOOK_LINK } from '../utils/constants'
import { useTheme } from '../hooks/useTheme'
import { PieChart } from './Charts/PieComponent'
import { NodeLink } from './ChatApp/NodeLink'
import {
  Flashcard,
  FlashcardResponse,
  MessageData,
  Notebook,
  TAssistantNotebookMessage,
} from '../types'
import {
  generateNotebookIntro,
  generateNotebookProposalApproval,
} from '../utils/messages'
import { ONECADEMY_IFRAME_URL } from '../utils/constants'
import { getCurrentDateYYMMDD } from '../utils/date'
import { RiveComponentMemoized } from './ChatApp/RiveMemoized'
import { INotebook } from '../types/INotebook'
import { MessageAction } from '../types'
import ArticleIcon from '@mui/icons-material/Article'
import CodeIcon from '@mui/icons-material/Code'
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects'

import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import LocalLibraryIcon from '@mui/icons-material/LocalLibrary'
import LockIcon from '@mui/icons-material/Lock'
import MenuBookIcon from '@mui/icons-material/MenuBook'

import ShareIcon from '@mui/icons-material/Share'
import { SvgIconProps } from '@mui/material/SvgIcon'

import { FC } from 'react'

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

const NodeTypeIcon: FC<any> = ({
  nodeType,
  tooltipPlacement,
  color = 'primary',
  ...rest
}) => {
  const renderIcon = () => {
    switch (nodeType) {
      case 'Code':
        return <CodeIcon color={color} {...rest} />
      case 'Concept':
        return <LocalLibraryIcon color={color} {...rest} />
      case 'Relation':
        return <ShareIcon color={color} {...rest} />
      case 'Question':
        return <HelpOutlineIcon color={color} {...rest} />
      case 'Reference':
        return <MenuBookIcon color={color} {...rest} />
      case 'Idea':
        return <EmojiObjectsIcon color={color} {...rest} />
      case 'News':
        return <ArticleIcon color={color} {...rest} />
      default:
        return <LockIcon color={color} {...rest} />
    }
  }

  if (!nodeType) return null

  if (tooltipPlacement)
    return (
      <Tooltip title={`${nodeType} node`} placement={tooltipPlacement}>
        {renderIcon()}
      </Tooltip>
    )

  return renderIcon()
}
const getAction = (proposed: boolean, nodeId: string, flashcard: any) => {
  const action = proposed ? 'Open in the Notebook' : 'Propose'
  let onClick = () => {
    if (!proposed) {
      console.log({ proposed })
      chrome.runtime.sendMessage({
        type: 'START_PROPOSING',
        flashcards: [flashcard],
        request: 'request',
        selection: 'request',
        notebooks: [],
        tabId: 0,
      } as TAssistantNotebookMessage)

      // starting to propose
      console.log('-> ProposeIt')
    } else {
      // open in the notebook
      console.log('-> Open The Notebook', nodeId)
    }
  }
  return (
    <Button onClick={onClick} variant="contained">
      {action}
    </Button>
  )
}

function SidebarNodes() {
  const db = getFirestore()
  const [flashcards, setFlashcards] = useState<any[]>([])
  const [tabcUrl, setTabUrl] = useState<string>('')
  const [section, setSection] = useState<string>('')
  const [nodesWidth, setNodesWidth] = useState<number>(0)
  const { mode } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      const baseURL =
        location.protocol + '//' + location.host + location.pathname
      let scrollPosition = window.pageYOffset
      let sections = document.querySelectorAll('section')
      setNodesWidth((window.innerWidth - sections[1].offsetWidth) / 2 - 10)
      for (let i = 0; i < sections.length; i++) {
        let section = sections[i]
        let sectionPosition = section.offsetTop
        if (scrollPosition >= sectionPosition) {
          const headerElement = section.getElementsByTagName('header')[0]
          const sectionElement =
            i === 0
              ? headerElement
                  .getElementsByClassName('subheadline save-1')[0]
                  ?.getElementsByTagName('a')[0]
              : headerElement?.getElementsByTagName('a')[0]
          const sectionLink = baseURL + sectionElement?.getAttribute('href')
          setTabUrl(sectionLink)
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  useEffect(() => {
    const handleUrlChange = async () => {
      const currentUrl = window.location.href
      if (currentUrl) {
        console.log(mode)
        setTabUrl(currentUrl)
      }
    }
    handleUrlChange()
    window.addEventListener('popstate', handleUrlChange)
    return () => {
      window.removeEventListener('popstate', handleUrlChange)
    }
  }, [])
  useEffect(() => {
    const q = query(
      collection(db, 'tempFlashcards'),
      where('link', '==', tabcUrl)
    )
    console.log({ tabcUrl })
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let _flashcards: any[] = []
      let _section = ''
      querySnapshot.forEach((doc) => {
        if (tabcUrl.includes(doc.data().link)) {
          _flashcards = doc.data().flashcards
          _section = doc.data().section
        }
      })
      _flashcards.forEach((flashcard) => {
        flashcard.id = flashcard.title
      })
      console.log(_flashcards)
      setFlashcards(_flashcards)
      setSection(_section)
    })
    return () => {
      unsubscribe()
    }
  }, [tabcUrl])
  console.log('flashcards', flashcards)
  return (
    <>
      {tabcUrl.startsWith('https://www.core-econ.org/') &&
        flashcards.length > 0 && (
          <Paper
            sx={{
              position: 'fixed',
              top: '0px',
              right: '0px',
              zIndex: 99,
              width: nodesWidth,
              height: '100vh',
              overflow: 'auto',
              backgroundColor: mode === 'light' ? '#F9FAFB' : '#1B1A1A',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                color:
                  mode === 'light'
                    ? DESIGN_SYSTEM_COLORS.baseBlack
                    : DESIGN_SYSTEM_COLORS.baseWhite,
                position: 'sticky',
                ml: '10px',
                mt: '10px',
                mb: '10px',
              }}
            >
              {section}
            </Typography>
            {flashcards?.map((flashcard: any) => (
              <Paper
                elevation={3}
                key={`resNode${flashcard.id}`}
                sx={{
                  overflow: 'hidden',
                  listStyle: 'none',
                  mb: '10px',
                  padding: {
                    xs: '5px 10px',
                    sm: '12px 16px 10px 16px',
                  },
                  background:
                    mode === 'light'
                      ? DESIGN_SYSTEM_COLORS.gray100
                      : DESIGN_SYSTEM_COLORS.notebookG700,
                  borderRadius: '8px',
                  borderLeft:
                    'proposed' in flashcard && flashcard.proposed
                      ? 'solid 6px #fd7373'
                      : 'solid 6px #fdc473',
                  ':hover': {
                    backgroundColor:
                      mode === 'light'
                        ? DESIGN_SYSTEM_COLORS.gray250
                        : DESIGN_SYSTEM_COLORS.notebookG500,
                  },
                  ml: '10px',
                  mt: '10px',
                }}
              >
                <Typography
                  variant="h5"
                  style={{
                    color:
                      mode === 'light'
                        ? DESIGN_SYSTEM_COLORS.baseBlack
                        : DESIGN_SYSTEM_COLORS.baseWhite,
                  }}
                >
                  {flashcard.title}
                </Typography>
                <Typography
                  style={{
                    color:
                      mode === 'light'
                        ? DESIGN_SYSTEM_COLORS.baseBlack
                        : DESIGN_SYSTEM_COLORS.baseWhite,
                  }}
                >
                  {flashcard.content}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    mt: '15px',
                  }}
                >
                  {getAction(flashcard.proposed, flashcard.nodeId, flashcard)}
                </Box>
                <NodeTypeIcon
                  nodeType={flashcard.type || ''}
                  fontSize="inherit"
                />
              </Paper>
            ))}
          </Paper>
        )}
    </>
  )
}

const SidebarNodesWrapper = () => (
  <ThemeProvider theme={brandingLightTheme}>
    <SidebarNodes />
  </ThemeProvider>
)

export default SidebarNodesWrapper