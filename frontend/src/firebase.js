import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { firebaseConfig, functionsEmulatorUrl } from "./config/runtime";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const functions = getFunctions(app);

if (functionsEmulatorUrl) {
  const { hostname, port } = new URL(functionsEmulatorUrl);
  if (["localhost", "127.0.0.1"].includes(hostname) && port) {
    connectFunctionsEmulator(functions, hostname, Number(port));
  }
}
