import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import uploadRoutes from "./routes/routes.js";

// dotenv.config();

const app = express();

app.use(cors());

// app.use(express.json());
app.use(express.json());
app.use('/api/upload', uploadRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);

})