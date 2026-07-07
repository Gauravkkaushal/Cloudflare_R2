# Express Server Se Firebase Cloud Functions Migration Guide

Ye document explain karta hai ki is project me Express server ke upload route ko Firebase Cloud Function me kaise convert kiya gaya, har change kyun kiya gaya, bina us change ke kya problem hoti, aur background me complete upload flow kaise work karta hai.

## 1. Pehle Architecture Kya Tha

Pehle upload flow Express server ke through chal raha tha:

```txt
Frontend
  -> Express server: http://localhost:5000/api/upload/presigned-url
  -> Express verifies Firebase token
  -> Express creates Cloudflare R2 signed URLs
  -> Frontend uploads file directly to R2
```

Express server ke main parts ye the:

```js
const app = express();
app.use(cors(...));
app.use(express.json());
app.use("/api/upload", uploadRoutes);
app.listen(process.env.PORT, ...);
```

Iska matlab tha ki tumhe ek separate Node/Express server run karna padta tha. Agar server run nahi hota, frontend upload nahi kar pata.

## 2. Ab Architecture Kya Hai

Ab Express server ki jagah Firebase HTTPS Cloud Function use ho rahi hai:

```txt
Frontend
  -> Firebase Cloud Function
  -> Cloud Function verifies Firebase token
  -> Cloud Function creates Cloudflare R2 signed URLs
  -> Frontend uploads file directly to R2
```

Local emulator URL:

```txt
http://127.0.0.1:5001/r2-project-5b86f/us-central1/createPresignedUploadUrl
```

Ab separate `app.listen()` server ki zaroorat nahi hai. Firebase emulator ya Firebase production environment HTTP request receive karta hai aur exported function ko call karta hai.

## 3. Main Files Jo Change Hui

### `functions/index.js`

Yahan main Firebase Cloud Function likhi gayi:

```js
exports.createPresignedUploadUrl = onRequest(async (req, res) => {
  ...
});
```

Ye Express route ka replacement hai.

### `functions/package.json`

Isme AWS SDK dependencies add hui:

```json
"@aws-sdk/client-s3": "^3.1080.0",
"@aws-sdk/s3-request-presigner": "^3.1080.0"
```

Ye packages Cloudflare R2 ke signed upload/view URLs create karne ke liye required hain.

### `functions/.env`

Real secret values yahan rakhi jati hain:

```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY_ID=...
R2_BUCKET_NAME=...
```

Ye file commit nahi honi chahiye.

### `functions/.env.example`

Isme sirf placeholders hone chahiye:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY_ID=your-r2-secret-access-key
R2_BUCKET_NAME=your-r2-bucket-name
```

Iska purpose hai ki kisi naye developer ko pata chale kaunse environment variables required hain, bina real secrets expose kiye.

### `frontend/src/FileUpload.jsx`

Frontend ka upload API URL old Express server se Firebase Function par change hua:

```js
const CREATE_PRESIGNED_UPLOAD_URL =
  "http://127.0.0.1:5001/r2-project-5b86f/us-central1/createPresignedUploadUrl";
```

Pehle ye call hoti thi:

```txt
http://localhost:5000/api/upload/presigned-url
```

Ab frontend directly Firebase Function ko call karta hai.

## 4. `functions/index.js` Ka Breakdown

### 4.1 `randomUUID`

```js
const { randomUUID } = require("node:crypto");
```

Ye har uploaded file ke liye unique filename create karta hai.

Example object key:

```txt
uploads/user123/2026/07/07/550e8400-e29b-41d4-a716-446655440000.png
```

Kyun use kiya:

- Same filename upload hone par overwrite na ho.
- User ke files uniquely store ho.
- File path predictable na ho.

Bina iske kya hota:

- Agar user baar-baar `image.png` upload kare, files overwrite ho sakti hain.
- Security aur organization weak ho jati.

### 4.2 Firebase Admin Initialization

```js
const { initializeApp } = require("firebase-admin/app");
initializeApp();
```

Cloud Function ke andar Firebase Admin SDK initialize karta hai.

Kyun use kiya:

- Firebase Auth token verify karne ke liye.
- Future me Firestore/Admin operations karne ke liye.

Bina iske kya hota:

- `getAuth().verifyIdToken(...)` kaam nahi karega.
- Token verification fail ho sakti hai.

Important point:

Cloud Functions me service account JSON manually load karne ki zaroorat nahi hoti. Firebase runtime automatically credentials provide karta hai.

### 4.3 Firebase Auth

```js
const { getAuth } = require("firebase-admin/auth");
```

Ye frontend se aaye Firebase ID token ko verify karta hai.

Frontend token bhejta hai:

```txt
Authorization: Bearer <firebase-id-token>
```

Function me verify hota hai:

```js
const decodedToken = await getAuth().verifyIdToken(idToken);
```

Kyun use kiya:

- Sirf logged-in users ko upload URL mile.
- Har upload ko user ID ke folder me store kar sake.

Bina iske kya hota:

- Koi bhi anonymous user API call karke R2 upload URLs generate kar sakta.
- Storage abuse, cost increase, unauthorized uploads ho sakte hain.

### 4.4 `setGlobalOptions`

```js
setGlobalOptions({ maxInstances: 10 });
```

Ye Cloud Function ke maximum running instances limit karta hai.

Kyun use kiya:

- Sudden traffic spike me cost control.
- Accidental abuse me unlimited scaling avoid hoti hai.

Bina iske kya hota:

- Function traffic ke according zyada instances create kar sakti hai.
- Bill unexpectedly badh sakta hai.

### 4.5 `onRequest`

```js
const { onRequest } = require("firebase-functions/https");
```

`onRequest` ek HTTPS Cloud Function banata hai. Iska behavior Express route jaisa hota hai: `req` aur `res` milte hain.

Kyun use kiya:

- Frontend normal HTTP POST request bhej sake.
- Express server ke bina route-like behavior mil jaye.

Bina iske kya hota:

- Function HTTP request receive nahi karegi.
- Frontend API endpoint available nahi hoga.

### 4.6 Logger

```js
const logger = require("firebase-functions/logger");
```

Firebase-compatible logs write karta hai.

Kyun use kiya:

- Emulator/production logs me structured messages milte hain.
- Debugging easy hoti hai.

Bina iske kya hota:

- `console.log` bhi work karta, but Firebase logs me structured context kam hota.

### 4.7 AWS SDK for Cloudflare R2

```js
const { GetObjectCommand, PutObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
```

Cloudflare R2 S3-compatible hai. Isliye AWS S3 SDK use karke R2 ke liye signed URLs create kiye ja sakte hain.

`PutObjectCommand`:

- Upload URL generate karta hai.
- Frontend file ko R2 me upload karne ke liye use karta hai.

`GetObjectCommand`:

- View/download URL generate karta hai.
- Upload ke baad file preview/display ke liye use hota hai.

`getSignedUrl`:

- Temporary secure URL create karta hai.

Bina iske kya hota:

- Frontend ko R2 secret keys deni padti, jo extremely unsafe hai.
- Ya upload possible nahi hota.

## 5. CORS Kya Hai Aur Kyun Chahiye

Code:

```js
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:4200",
]);
```

```js
function setCorsHeaders(req, res) {
  const origin = req.get("origin");

  if (ALLOWED_ORIGINS.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
  }

  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
```

CORS browser security feature hai. Frontend `localhost:5173` par chal raha hai, function `localhost:5001` par. Browser inhe different origins maanta hai.

Kyun use kiya:

- Browser ko allow karna ki frontend Cloud Function ko call kar sake.
- `Authorization` header allow karna, kyunki token wahi header me bheja jata hai.

Bina iske kya hota:

- Browser request block kar deta.
- Console me CORS error aata.
- Function tak request pahunch bhi sakti hai, but browser response frontend ko nahi deta.

## 6. OPTIONS Request Kya Hoti Hai

Code:

```js
if (req.method === "OPTIONS") {
  res.status(204).send("");
  return;
}
```

Browser kabhi-kabhi actual POST se pehle ek `OPTIONS` request bhejta hai. Isse preflight request bolte hain.

Browser check karta hai:

- Kya server POST allow karta hai?
- Kya server `Authorization` header allow karta hai?
- Kya origin allowed hai?

Kyun handle kiya:

- Browser ko permission response dene ke liye.

Bina iske kya hota:

- Browser actual POST request bhejne se pehle hi block kar sakta hai.
- CORS/preflight error mil sakta hai.

## 7. Sirf POST Method Kyun Allowed Hai

Code:

```js
if (req.method !== "POST") {
  res.status(405).json({ error: "Method not allowed" });
  return;
}
```

Ye function data receive karke signed URL create karta hai, isliye `POST` suitable method hai.

Browser address bar se URL open karne par `GET` request jati hai. Isliye browser me direct open karne par ye response aata hai:

```json
{ "error": "Method not allowed" }
```

Ye error actually good sign hai: function load ho rahi hai.

Bina method check ke kya hota:

- GET request bhi processing try kar sakti.
- Invalid request errors confusing ho sakte.
- API behavior less strict ho jata.

## 8. Token Verification Flow

Helper:

```js
async function verifyFirebaseToken(req) {
  const authHeader = req.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No token provided");
  }

  const idToken = authHeader.slice("Bearer ".length);
  const decodedToken = await getAuth().verifyIdToken(idToken);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name,
  };
}
```

Frontend:

```js
const idToken = await currentUser.getIdToken();
```

Request:

```js
headers: {
  Authorization: `Bearer ${idToken}`,
}
```

Background me:

1. User Google/Firebase Auth se login karta hai.
2. Firebase frontend SDK current user ke liye ID token generate karta hai.
3. Frontend token ko `Authorization` header me Cloud Function ko bhejta hai.
4. Cloud Function Admin SDK se token verify karti hai.
5. Agar token valid hai, user ka `uid` milta hai.
6. Usi `uid` se R2 object path banaya jata hai.

Bina token verification ke:

- API public ho jati.
- Unauthorized users upload URL generate kar sakte.
- User-specific folder structure reliable nahi rahta.

Common 401 reasons:

- User login nahi hai.
- Token missing hai.
- Token expired hai.
- Auth emulator aur real Firebase Auth mix ho rahe hain.

## 9. File Validation

Allowed file types:

```js
const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};
```

Max size:

```js
const MAX_FILE_SIZE = 100 * 1024 * 1024;
```

Kyun use kiya:

- Dangerous/unsupported file types block karne ke liye.
- Very large uploads avoid karne ke liye.
- R2 cost aur bandwidth control ke liye.

Bina validation ke:

- User kuch bhi upload kar sakta.
- Storage cost badh sakti.
- App unsupported files ko render nahi kar payega.

Note:

Frontend me bhi validation hai, backend/function me bhi validation hai. Dono zaroori hain.

- Frontend validation user experience ke liye.
- Backend validation security ke liye.

Frontend validation ko user bypass kar sakta hai, but backend validation ko nahi.

## 10. R2 Client Kaise Banta Hai

Code:

```js
function getR2Client() {
  const {
    R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY_ID,
  } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY_ID) {
    throw new Error("Missing one or more required R2 environment variables.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY_ID,
    },
  });
}
```

R2 S3-compatible API expose karta hai. `S3Client` ko Cloudflare endpoint aur credentials diye jate hain.

Kyun environment variables use kiye:

- Secrets code me hardcode nahi hote.
- Local aur production values alag ho sakti hain.
- GitHub/repo me credentials leak nahi hote.

Bina env variables ke:

- Credentials code me likhne padte, unsafe.
- Secret rotate karna hard hota.
- Repo public/private dono case me risk badhta.

## 11. Object Key Kaise Banta Hai

Code:

```js
const objectKey = `uploads/${user.uid}/${year}/${month}/${day}/${randomUUID()}.${ext}`;
```

Example:

```txt
uploads/abcUserId/2026/07/07/550e8400-e29b-41d4-a716-446655440000.png
```

Is structure ke benefits:

- Har user ka separate folder.
- Date-wise organization.
- Unique filenames.
- Future cleanup/querying easy.

Bina user ID ke:

- Files ko user se associate karna difficult hota.

Bina date folders ke:

- Ek folder me bahut saari files jama ho sakti hain.

Bina UUID ke:

- Same filename collision/overwrite ka risk.

## 12. Signed Upload URL Kaise Banta Hai

Code:

```js
const uploadCommand = new PutObjectCommand({
  Bucket: bucketName,
  Key: objectKey,
  ContentType: fileType,
});

const uploadUrl = await getSignedUrl(r2Client, uploadCommand, {
  expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
});
```

Ye ek temporary URL generate karta hai jisse frontend directly R2 me file upload kar sakta hai.

Kyun direct upload:

- File Cloud Function ke through pass nahi hoti.
- Function bandwidth aur memory save hoti hai.
- Large file upload better handle hota hai.

Bina signed URL approach ke:

- File pehle Cloud Function me upload hoti, phir R2 me.
- Function timeout/memory issue aa sakte.
- Firebase cost aur latency badh sakti hai.

## 13. Signed View URL Kaise Banta Hai

Code:

```js
const viewCommand = new GetObjectCommand({
  Bucket: bucketName,
  Key: objectKey,
});

const viewUrl = await getSignedUrl(r2Client, viewCommand, {
  expiresIn: SIGNED_URL_EXPIRES_IN_SECONDS,
});
```

Ye temporary URL frontend ko file view karne ke liye milta hai.

Kyun use kiya:

- Bucket private reh sakta hai.
- Public access expose nahi hota.
- URL limited time ke liye valid hota hai.

Bina view signed URL ke:

- Ya bucket public karna padega.
- Ya frontend uploaded file immediately view nahi kar payega.

## 14. Frontend Me Flow Kaise Kaam Karta Hai

File: `frontend/src/FileUpload.jsx`

### Step 1: User file select karta hai

```js
const selected = e.target.files[0];
```

Frontend file type aur size validate karta hai.

### Step 2: User login check

```js
const currentUser = auth.currentUser;
if (!currentUser) {
  setError("Please log in first.");
  return;
}
```

Agar user login nahi hai to upload stop ho jata hai.

### Step 3: Firebase ID token lena

```js
const idToken = await currentUser.getIdToken();
```

Ye token Cloud Function ko prove karta hai ki user logged in hai.

### Step 4: Cloud Function ko POST request

```js
const { data } = await axios.post(CREATE_PRESIGNED_UPLOAD_URL, {
  fileName: file.name,
  fileType: file.type,
  fileSize: file.size,
}, {
  headers: {
    Authorization: `Bearer ${idToken}`,
  },
});
```

Function response:

```json
{
  "uploadUrl": "...",
  "viewUrl": "...",
  "objectKey": "uploads/..."
}
```

### Step 5: File directly R2 me upload

```js
await axios.put(uploadUrl, file, {
  headers: { "Content-Type": file.type },
  onUploadProgress: (e) => {
    setProgress(Math.round((e.loaded * 100) / e.total));
  },
});
```

Important:

File Firebase Cloud Function ke paas nahi ja rahi. Function sirf permission URL banata hai. Actual file browser se direct R2 me jaati hai.

### Step 6: Uploaded preview

```js
setUploadedUrl(viewUrl);
setStatus("success");
```

Frontend `viewUrl` use karke uploaded image/video show karta hai.

## 15. Why We Removed `PORT`

Old Express server me:

```env
PORT=5000
```

required tha, kyunki Express ko batana padta tha kis port par listen karna hai.

Firebase Cloud Functions me `PORT` use nahi karna chahiye. Firebase emulator/runtime port khud manage karta hai.

Problem:

```env
PORT = 5000
```

`functions/.env` me tha, jiski wajah se Firebase ne error diya:

```txt
Failed to load environment variables from .env
```

Kyun:

- `PORT` Firebase Functions environment me reserved variable hai.
- User-defined env file me reserved names allowed nahi hote.

Solution:

- `PORT` ko `functions/.env` se remove kiya.

## 16. `.env` Aur `.env.example` Ka Difference

### `.env`

Real secrets:

```env
R2_ACCOUNT_ID=real-value
R2_ACCESS_KEY_ID=real-value
R2_SECRET_ACCESS_KEY_ID=real-value
R2_BUCKET_NAME=real-value
```

Ye local file hai. Commit nahi karni.

### `.env.example`

Placeholder documentation:

```env
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY_ID=your-r2-secret-access-key
R2_BUCKET_NAME=your-r2-bucket-name
```

Ye commit ho sakti hai, kyunki isme secrets nahi hain.

## 17. Common Errors Aur Meaning

### Browser me `{ "error": "Method not allowed" }`

Reason:

- Browser address bar `GET` request bhejta hai.
- Function sirf `POST` allow karti hai.

Meaning:

- Function load ho rahi hai.
- Endpoint exist karta hai.
- Test Thunder Client/Postman/frontend se POST request se karo.

### `401 Invalid or expired token`

Reason:

- Authorization header missing.
- Token invalid/expired.
- User logged in nahi.
- Auth emulator aur real Firebase Auth mix ho rahe hain.

Fix:

- Frontend se fresh token lo:

```js
const idToken = await auth.currentUser.getIdToken(true);
```

- Ensure karo request me header ho:

```txt
Authorization: Bearer <token>
```

### `400 File type not allowed`

Reason:

- File MIME type allowed list me nahi hai.

Allowed:

```txt
image/jpeg
image/png
image/webp
image/gif
video/mp4
video/webm
video/quicktime
```

### `400 fileName, fileType, and fileSize are required`

Reason:

- Request body incomplete hai.

Correct body:

```json
{
  "fileName": "test.png",
  "fileType": "image/png",
  "fileSize": 12345
}
```

### `500 Failed to generate upload URL`

Possible reasons:

- R2 env variables missing.
- R2 credentials wrong.
- Bucket name wrong.
- Cloudflare account ID wrong.
- R2 API key does not have required permission.

## 18. Local Testing Steps

### Start Functions emulator

```bash
npx -y firebase-tools@latest emulators:start --only functions
```

If port already used:

- Old emulator terminal stop karo with `Ctrl + C`.
- Fir command rerun karo.

### Start frontend

```bash
cd frontend
npm run dev
```

### Test through app

1. Browser me frontend open karo.
2. Google se sign in karo.
3. File choose karo.
4. Upload button click karo.
5. Success hone par uploaded preview dikhega.

## 19. Thunder Client/Postman Se Test

Endpoint:

```txt
POST http://127.0.0.1:5001/r2-project-5b86f/us-central1/createPresignedUploadUrl
```

Headers:

```txt
Content-Type: application/json
Authorization: Bearer <firebase-id-token>
```

Body:

```json
{
  "fileName": "test.png",
  "fileType": "image/png",
  "fileSize": 12345
}
```

Expected response:

```json
{
  "uploadUrl": "https://...",
  "viewUrl": "https://...",
  "objectKey": "uploads/..."
}
```

## 20. Production Deployment Notes

Local emulator URL:

```txt
http://127.0.0.1:5001/r2-project-5b86f/us-central1/createPresignedUploadUrl
```

Production deployed URL usually looks like:

```txt
https://us-central1-r2-project-5b86f.cloudfunctions.net/createPresignedUploadUrl
```

Before production:

1. Add production frontend domain to `ALLOWED_ORIGINS`.
2. Configure R2 environment variables for deployed functions.
3. Change frontend API URL based on environment.
4. Do not commit real R2 secrets.

## 21. Background Flow Summary

Complete flow:

```txt
User selects file
  -> Frontend validates type/size
  -> Frontend gets Firebase ID token
  -> Frontend POSTs metadata + token to Cloud Function
  -> Cloud Function handles CORS
  -> Cloud Function verifies token with Firebase Admin
  -> Cloud Function validates file metadata
  -> Cloud Function creates R2 object key
  -> Cloud Function creates signed PUT URL
  -> Cloud Function creates signed GET URL
  -> Frontend receives URLs
  -> Frontend PUTs actual file directly to R2
  -> Frontend shows uploaded file using view URL
```

Most important concept:

The Cloud Function never receives the actual file. It only creates a temporary permission URL. This is faster, safer, and cheaper than uploading large files through your server/function.

## 22. Why This Is Better Than Express Server For This Use Case

Benefits:

- No separate Express server to run/deploy.
- Firebase handles HTTP function hosting.
- Auth verification happens securely on backend.
- R2 secrets stay server-side.
- File upload goes directly from browser to R2.
- Better scaling than a manually managed local Express server.
- Easier Firebase deployment path.

Tradeoff:

- Function cold starts can happen in production.
- Environment variables need proper Firebase setup.
- For complex APIs, organizing multiple functions/modules becomes important.

For this upload use case, Cloud Functions are a good fit because the backend only needs to authorize the user and generate signed URLs.
