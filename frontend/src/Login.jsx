import { useState, useEffect, useEffectEvent } from "react";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export default function Login({ onUserChange }) {
    const [user, setUser] = useState(null);
    const notifyUserChange = useEffectEvent((currentUser) => {
        onUserChange(currentUser);
    });

    // Listen for auth state changes (stays logged in on refresh)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            notifyUserChange(currentUser);
        });
        return () => unsubscribe();
    }, [notifyUserChange]);

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error.message);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <div style={{ textAlign: "center", marginBottom: 20 }}>
            {user ? (
                <div>
                    <img
                        src={user.photoURL}
                        alt="profile"
                        style={{ width: 40, height: 40, borderRadius: "50%" }}
                    />
                    <p>Welcome, {user.displayName}</p>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            ) : (
                <button onClick={handleGoogleLogin}>Sign in with Google</button>
            )}
        </div>
    );
}
