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

import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from 'firebase/firestore'

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
  const { mode } = useTheme()

  useEffect(() => {
    const handleScroll = () => {
      const baseURL =
        location.protocol + '//' + location.host + location.pathname
      var scrollPosition = window.pageYOffset
      var sections = document.querySelectorAll('section')

      for (var i = 0; i < sections.length; i++) {
        var section = sections[i]
        var sectionPosition = section.offsetTop
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
              width: '400px',
              height: '100vh',
              overflow: 'auto',
              backgroundColor: mode === 'light' ? '#F9FAFB' : '#1B1A1A',
            }}
          >
            <Typography
              variant="h5"
              style={{
                color:
                  mode === 'light'
                    ? DESIGN_SYSTEM_COLORS.baseBlack
                    : DESIGN_SYSTEM_COLORS.baseWhite,
                position: 'sticky',
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
                  mb: '2px',
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
                {getAction(flashcard.proposed, flashcard.nodeId, flashcard)}
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
