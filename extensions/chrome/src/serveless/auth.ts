import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { collection, getDocs, getFirestore, limit, query, where } from "firebase/firestore";
import { Reputation, User, UserBackground, UserRole, UserTheme, UserView } from "../types";

export const signUp = async (name: string, email: string, password: string) => {
  const newUser = await createUserWithEmailAndPassword(getAuth(), email, password);
  await updateProfile(newUser.user, { displayName: name });
};

export const signIn = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(getAuth(), email, password);
  return userCredential.user;
};

export const sendVerificationEmail = async () => {
  const auth = getAuth();
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  }
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(getAuth(), email);
};

export const logout = async () => {
  await signOut(getAuth());
};

export const getIdToken = async (): Promise<string | undefined> => {
  const auth = getAuth();
  const token = auth.currentUser?.getIdToken(/* forceRefresh */ true);
  return token;
};

export const retrieveAuthenticatedUser = async (userId: string, role: UserRole) => {
  let user: User | null = null;
  let reputationsData: Reputation | null = null;
  let theme: UserTheme = "Dark";
  let view: UserView = "Graph";
  let background: UserBackground = "Color";
  let showClusterOptions = false;
  let showClusters = false;
  const db = getFirestore();

  const nodesRef = collection(db, "users");
  const q = query(nodesRef, where("userId", "==", userId), limit(1));
  const userDoc = await getDocs(q);
  if (userDoc.size !== 0) {
    const userData = userDoc.docs[0].data();

    user = {
      userId,
      birthDate: userData.birthDate ? userData.birthDate.toDate() : null,
      deCourse: userData.deCourse,
      deInstit: userData.deInstit,
      deMajor: userData.deMajor,
      tag: userData.tag,
      tagId: userData.tagId,
      deCredits: userData.deCredits,
      sNode: "sNode" in userData ? userData.sNode : null,
      practicing: userData.practicing,
      imageUrl: userData.imageUrl,
      fName: userData.fName,
      lName: userData.lName,
      chooseUname: userData.chooseUname,
      lang: userData.lang,
      gender: userData.gender,
      ethnicity: userData.ethnicity ?? [],
      country: userData.country,
      state: userData.state,
      city: userData.city,
      uname: userData.uname,
      clickedConsent: userData.clickedConsent,
      clickedTOS: userData.clickedTOS,
      clickedPP: userData.clickedPP,
      clickedCP: userData.clickedCP,
      createdAt: userData.createdAt.toDate(),
      email: userData.email,
      reason: userData.reason,
      foundFrom: userData.foundFrom,
      occupation: userData.occupation,
      fieldOfInterest: userData.fieldOfInterest ?? "",
      role,
      livelinessBar: userData.livelinessBar,
    };

    theme = userData.theme;
    view = "view" in userData ? userData.view : "Graph";
    background = "background" in userData ? userData.background : "Image";
    showClusterOptions = "showClusterOptions" in userData ? userData.showClusterOptions : false;
    showClusters = "showClusters" in userData ? userData.showClusters : false;

    const reputationRef = collection(db, "reputations");
    const reputationQuery = query(
      reputationRef,
      where("uname", "==", userData.uname),
      where("tagId", "==", userData.tagId),
      limit(1)
    );

    const reputationsDoc = await getDocs(reputationQuery);
    if (reputationsDoc.docs.length !== 0) {
      const reputationDoc = reputationsDoc.docs[0];
      reputationsData = reputationDoc.data() as Reputation;
    }
  }

  return {
    user,
    reputation: reputationsData,
    theme,
    background,
    view,
    showClusterOptions,
    showClusters,
  };
};
