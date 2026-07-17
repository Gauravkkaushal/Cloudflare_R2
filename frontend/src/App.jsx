import { useState } from 'react'
import './App.css'
import { FileUploadContainer } from './features/file-upload'
import Login from './Login'

function App() {
  const [user, setUser] = useState(null);
  return (
    <>
      <Login onUserChange={setUser} />
      {user ? (
        <FileUploadContainer />
      ) : (
        <p style={{ textAlign: "center" }}>Please sign in to upload files.</p>
      )}
    </>
  )
}

export default App
