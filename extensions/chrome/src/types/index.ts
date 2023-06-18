import { Timestamp } from "firebase/firestore";
import { Dispatch, ReactNode } from "react";
import { INotebook } from "./INotebook";

export type NodeType =
  | "Relation"
  | "Concept"
  | "Code"
  | "Reference"
  | "Idea"
  | "Question"
  | "News"
  | "Profile"
  | "Sequel"
  | "Advertisement"
  | "Private";

export type ErrorOptions = {
  error: unknown;
  showErrorToast?: boolean;
  errorMessage?: string;
};

export type UserSettings = {
  background: UserBackground;
  theme: UserTheme;
  view: UserView;
  showClusterOptions: boolean;
  showClusters: boolean;
};

export type Reputation = {
  aCorrects: number;
  aInst: number;
  aWrongs: number;
  cdCorrects: number;
  cdInst: number;
  cdWrongs: number;
  cnCorrects: number;
  cnInst: number;
  cnWrongs: number;
  createdAt: Date;
  iCorrects: number;
  iInst: number;
  iWrongs: number;
  isAdmin: boolean;
  lterm: number;
  ltermDay: number;
  mCorrects: number;
  mInst: number;
  mWrongs: number;
  nCorrects: number;
  nInst: number;
  nWrongs: number;
  negatives: number;
  pCorrects: number;
  pInst: number;
  pWrongs: number;
  positives: number;
  qCorrects: number;
  qInst: number;
  qWrongs: number;
  rfCorrects: number;
  rfInst: number;
  rfWrongs: number;
  sCorrects: number;
  sInst: number;
  sWrongs: number;
  tag: string;
  tagId: string;
  totalPoints: number;
  uname: string;
  updatedAt: Date;
};

export type UserTheme = "Dark" | "Light";

export type UserView = "Graph" | "Masonry";

export type UserBackground = "Color" | "Image";

export type UserRole = "INSTRUCTOR" | "STUDENT" | null;

export type User = {
  blocked?: boolean;
  chooseUname?: boolean;
  city?: string;
  clickedConsent?: boolean;
  clickedCP?: boolean;
  clickedPP?: boolean;
  clickedTOS?: boolean;
  clickedGDPR?: boolean;
  color?: string;
  consented?: boolean;
  GDPRPolicyAgreement?: boolean;
  termsOfServiceAgreement?: boolean;
  privacyPolicyAgreement?: boolean;
  cookiesAgreement?: boolean;
  ageAgreement?: boolean;
  country?: string;
  createdAt?: Timestamp;
  deCourse?: string;
  deCredits?: number;
  deInstit?: string;
  deMajor?: string;
  email: string;
  ethnicity: string[];
  fName?: string;
  gender?: string;
  imageUrl?: string;
  imgOrColor?: boolean;
  lName?: string;
  lang?: string;
  practicing?: boolean;
  sNode?: string;
  tag?: string;
  tagId?: string;
  uname: string;
  updatedAt?: Timestamp;
  userId: string;
  state?: string;
  education?: string;
  birthDate?: string;
  foundFrom: string;
  occupation: string;
  reason?: string;
  fieldOfInterest: string;
  role: UserRole;
  livelinessBar?: string;
};

export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly isAuthInitialized: boolean;
  readonly user: User | null;
  readonly reputation: Reputation | null;
  readonly settings: UserSettings;
}

export type AuthLogoutSuccessAction = {
  type: "logoutSuccess";
};

export type AuthLoginSuccessAction = {
  type: "loginSuccess";
  payload: {
    user: User;
    reputation: Reputation;
    theme: UserTheme;
    background: UserBackground;
    view: UserView;
    showClusterOptions: boolean;
    showClusters: boolean;
  };
};

export type SetThemeAction = {
  type: "setTheme";
  payload: UserTheme;
};

export type SetBackgroundAction = {
  type: "setBackground";
  payload: UserBackground;
};
export type SetShowClusterOptionsAction = {
  type: "setShowClusterOptions";
  payload: boolean;
};
export type SetShowClustersAction = {
  type: "setShowClusters";
  payload: boolean;
};
export type SetAuthUserAction = {
  type: "setAuthUser";
  payload: User;
};
export type SetViewAction = {
  type: "setView";
  payload: UserView;
};

export type SetReputationAction = {
  type: "setReputation";
  payload: Reputation;
};
export type DispatchAuthActions =
  | AuthLogoutSuccessAction
  | AuthLoginSuccessAction
  | SetThemeAction
  | SetBackgroundAction
  | SetShowClusterOptionsAction
  | SetShowClustersAction
  | SetAuthUserAction
  | SetViewAction
  | SetReputationAction;

export type AuthActions = {
    dispatch: Dispatch<DispatchAuthActions>;
    handleError: (options: ErrorOptions) => void;
};

export type IAssitantRequestAction =
  | "Practice"
  | "TeachContent"
  | "PracticeLater"
  | "Understood"
  | "ExplainMore"
  | "GeneralExplanation"
  | "IllContribute"
  | "DirectQuestion"
  | "ProposeIt" // to start chat in notebook for propose content
  | "ConfirmNodeSelection" // triggers when you select "Yes" after selecting a node
  | "ContinueNodeSelection" // triggers when you select "No" after selecting a node
  | "StartSkipOrCancel" // when you don't want to propose improvement after node selection
  | "ProposeImprovementConfirm" // triggers when you were able find node after Notebook selection for potential nodes and clicked "Yes"
  | "StartProposeImprovement"
  | "StartNodeSelection" // start selection of node for parent link
  | "StartChildProposal" // triggers when you select "No" for find node after Notebook selection for potential nodes
  | "ProceedPotentialNodes" // triggers when you are trying to skip potential node and click "Yes" to proceed with next node
  | "DontProceedPotentialNodes" // triggers when you are trying to skip potential node and click "No" to proceed with next node
  | "ReplaceWithImprovement" // triggers when you click on "Use the potential node title and content to generate an improvement proposal"
  | "CombineWithImprovement" // triggers when you click on "Combine the current title and content of the node with the title and content of the potential node"
  | "BackToBook"
  | "CompleteChat";

export type IAssistantRequestPayload = {
  actionType: IAssitantRequestAction;
  message: string;
  conversationId?: string;
};

export type NodeAssistantResponse = {
  type: NodeType;
  node: string;
  title: string;
  link: string;
  content: string;
  unit: string
  practice?: {
    totalQuestions: number;
    answered: number;
  };
}

export type IAssistantResponse = {
  conversationId: string;
  message: string;
  nodes?: NodeAssistantResponse[];
  is404?: boolean
  request: string
  actions?: {
    type: IAssitantRequestAction;
    title: string;
    variant: "contained" | "outline";
  }[];
};

export type IViewNodePayload = {
  notebookId: string;
  visible: boolean;
};

export type ViewNodeWorkerPayload = {
  nodeId: string,
  linkToOpenNode: string
  apiPayload: IViewNodePayload
};

export type ViewNodeWorkerResponse = {
  linkToOpenNode: string,
  messageType: string
}

export type IAssistantCreateNotebookRequestPayload = {
  message: string;
  conversationId: string;
};

export type CreateNotebookWorkerResponse = {
  notebookId: string,
  notebookTitle: string
  messageType: string
}

// export type CreateNotebookWorkerPayload = {
//     nodeId: string,
//     linkToOpenNode: string
//     apiPayload: IAssistantCreateNotebookRequestPayload
// }

export type IViewNodeOpenNodesPayload = {
  notebookId: string;
  visible: boolean;
  nodeIds: string[];
};

export type IAssistantRequestEventType =
"SELECT_NOTEBOOK" |
"REQUEST_ID_TOKEN";

export type IAssistantRequestMessage = {
  type: "REQUEST_ID_TOKEN"
};

export type IAssistantResponseMessage = {
  type: "NOTEBOOK_ID_TOKEN",
  token: string
};

/**
 * - NORMAL: is only content
 * - HELP: content + button to practice + teach content page
 * - NODE: Node Link + content
 * - PRACTICE: content + button to remind later + begin practice
 * - EXPLANATION: content + button to continue explaining + button to stop explanation
 */
// type MessageType = "NORMAL" | "HELP" | "NODE" | "PRACTICE";
export type NodeLinkType = {
  type: NodeType;
  id: string;
  title: string;
  link: string;
  content: string;
  unit: string;
  practice?: { answered: number, totalQuestions: number };
  nodeImage: string;
  nodeVideo: string
};

export type ActionVariant = "contained" | "outlined";

export type MessageAction = {
  type:
  | IAssitantRequestAction
  | "LOCAL_OPEN_NOTEBOOK"
  | "LOCAL_CONTINUE_EXPLANATION_HERE"
  | "NotebookSelected"
  | "ChooseNotebook"
  | "CreateNotebook"
  | "ChatNotebookCreate"
  title: string;
  variant: ActionVariant;
  data?: any;
};

export type MessageData = {
  id: string;
  type: "WRITER" | "READER";
  // uname: string;
  image: string;
  video: string;
  content: string;
  nodes: NodeLinkType[];
  actions: MessageAction[];
  hour: string;
  is404?: boolean
  request?: string
  componentContent?: any;
  practice?: { answered: number, totalQuestions: number };
};

export type Message = {
  date: string;
  messages: MessageData[];
};

export type Notebook = { id: string, name: string }

export type Flashcard = {
  title: string;
  type: "Relation" | "Concept";
  content: string;
}
export type FlashcardResponse = Flashcard[];

export type TAssistantResponseMessage = {
  type: "FLASHCARDS_RESPONSE",
  flashcards: FlashcardResponse,
  selection: string
};

export type TAssistantNotebookMessage = {
  type: "START_PROPOSING",
  flashcards: FlashcardResponse,
  request: string,
  selection: string,
  tabId: number,
  notebooks: INotebook[]
} | {
  type: "CREATE_NOTEBOOK",
  notebookId: string,
  notebookTitle: string,
  notebooks: INotebook[]
} | {
  type: "LOADING_COMPLETED"
};

export type TNode = {
  id: string;
  title: string;
}