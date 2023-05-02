import { Timestamp } from "firebase/firestore";
import { Dispatch } from "react";

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
    // stateInfo?: string;// CHECK: I comment and add state
    sNode?: string;
    tag?: string;
    tagId?: string;
    uname: string;
    updatedAt?: Timestamp;
    userId: string;
    state?: string;
    // stateId?: string;// this is not used and not exist in DB
    education?: string;
    birthDate?: string;
    foundFrom: string;
    occupation: string;
    reason?: string;
    // major?: string; //CHECK: I commented this because we have deMajor
    // instit?: string; //CHECK: I commented this because we have deInstit
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