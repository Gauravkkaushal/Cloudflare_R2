import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyC-DnjhXyQhS6gOeLx27ZUbpnY6INMXoJo",
    authDomain: "r2-project-5b86f.firebaseapp.com",
    projectId: "r2-project-5b86f",
    storageBucket: "r2-project-5b86f.firebasestorage.app",
    messagingSenderId: "930548330019",
    appId: "1:930548330019:web:b94b945538b91623e28b96"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();