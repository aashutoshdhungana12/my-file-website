```javascript
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Environment variables
const PASSWORD = process.env.PASSWORD;
const DELETE_PASSWORD = process.env.DELETE_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// Supabase connection
const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

const BUCKET = "files";

// Upload files into memory temporarily
const upload = multer({
    storage: multer.memoryStorage()
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Check main password
function checkPassword(req, res, next) {
    if (req.query.password !== PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Incorrect password."
        });
    }

    next();
}

// ==================== UPLOAD ====================

app.post(
    "/upload",
    checkPassword,
    upload.single("file"),
    async (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file selected."
            });
        }

        const fileName =
            Date.now() +
            "-" +
            Math.random().toString(36).substring(2, 8) +
            "-" +
            req.file.originalname;

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            console.error("Supabase upload error:", error);

            return res.status(500).json({
                success: false,
                message: "Upload failed."
            });
        }

        res.json({
            success: true,
            message: "File uploaded successfully."
        });
    }
);

// ==================== LIST FILES ====================

app.get("/files", checkPassword, async (req, res) => {

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("", {
            limit: 1000,
            sortBy: {
                column: "created_at",
                order: "desc"
            }
        });

    if (error) {
        console.error("Supabase list error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load files."
        });
    }

    const files = data
        .filter(file => file.name)
        .map(file => ({
            name: file.name,

            originalName: file.name.replace(
                /^\d+-[a-z0-9]+-/,
                ""
            ),

            createdAt: file.created_at,

            size: file.metadata?.size || 0
        }));

    res.json({
        success: true,
        files: files
    });
});

// ==================== DOWNLOAD ====================

app.get("/download/:file", checkPassword, async (req, res) => {

    const fileName = req.params.file;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(fileName);

    if (error) {
        console.error("Supabase download error:", error);

        return res.status(404).send("File not found.");
    }

    const originalName = fileName.replace(
        /^\d+-[a-z0-9]+-/,
        ""
    );

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${originalName}"`
    );

    res.send(
        Buffer.from(
            await data.arrayBuffer()
        )
    );
});

// ==================== DELETE ====================

app.post("/delete", async (req, res) => {

    const { file, password } = req.body;

    if (password !== DELETE_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Incorrect deletion password."
        });
    }

    if (!file) {
        return res.status(400).json({
            success: false,
            message: "No file specified."
        });
    }

    const { error } = await supabase.storage
        .from(BUCKET)
        .remove([file]);

    if (error) {
        console.error("Supabase delete error:", error);

        return res.status(500).json({
            success: false,
            message: "Delete failed."
        });
    }

    res.json({
        success: true,
        message: "File deleted successfully."
    });
});

// ==================== SERVER ====================

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```
