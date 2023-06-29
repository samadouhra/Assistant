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
              width: '500px',
              height: '100vh',
              overflow: 'auto',
              backgroundColor:
                mode === 'light'
                  ? DESIGN_SYSTEM_COLORS.gray50
                  : DESIGN_SYSTEM_COLORS.notebookG50,
            }}
          >
            <Typography variant="h5">{section}</Typography>
            {flashcards?.map((flashcard: any) => (
              <Paper
                key={flashcard.id}
                sx={{
                  p: '10px 12px',
                  backgroundColor:
                    mode === 'light'
                      ? DESIGN_SYSTEM_COLORS.gray100
                      : DESIGN_SYSTEM_COLORS.notebookG400,
                  borderRadius: '8px',
                  boxShadow:
                    '0px 1px 2px rgba(0, 0, 0, 0.06), 0px 1px 3px rgba(0, 0, 0, 0.1)',
                  mb: '5px',
                }}
              >
                <Typography
                  variant="h5"
                  style={{
                    color:
                      mode === 'light'
                        ? DESIGN_SYSTEM_COLORS.notebookO200
                        : DESIGN_SYSTEM_COLORS.primary50,
                  }}
                >
                  {flashcard.title}
                </Typography>
                <Typography
                  style={{
                    color:
                      mode === 'light'
                        ? DESIGN_SYSTEM_COLORS.notebookO200
                        : DESIGN_SYSTEM_COLORS.primary50,
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
