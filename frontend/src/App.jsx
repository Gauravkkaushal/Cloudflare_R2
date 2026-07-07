import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import FileUpload from './FileUpload'
import Login from './Login'

function App() {
  const [user, setUser] = useState(null);
  return (
    <>
      <Login onUserChange={setUser} />
      {user ? (
        <FileUpload />
      ) : (
        <p style={{ textAlign: "center" }}>Please sign in to upload files.</p>
      )}
    </>
  )
}

export default App
