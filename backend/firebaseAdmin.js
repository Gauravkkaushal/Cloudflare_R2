import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
const serviceAccount = JSON.parse(
    readFileSync("./firebase-service-account.json", "utf-8")
);

const app = getApps()[0] ?? initializeApp({
    credential: cert(serviceAccount),
});
export const adminAuth = getAuth(app);
