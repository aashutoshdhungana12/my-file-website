const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();

// Render provides the PORT automatically
const PORT = process.env.PORT || 3000;

// Environment variables
const PASSWORD = process.env.PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

// Connect to Supabase
const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

// Supabase Storage bucket
const BUCKET = "files";

// Store uploaded files temporarily in memory
const upload = multer({
    storage: multer.memoryStorage()
});

// Show website
app.use(express.static(path.join(__dirname, "public")));

// Check password
function checkPassword(req, res, next) {
    if (req.query.password !== PASSWORD) {
        return res.status(401).send("Incorrect password.");
    }

    next();
}

// Upload file to Supabase
app.post("/upload", checkPassword, upload.single("file"), async (req, res) => {

    if (!req.file) {
        return res.status(400).send("No file selected.");
    }

    const fileName = Date.now() + "-" + req.file.originalname;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(fileName, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
        });

    if (error) {
        console.error("Supabase upload error:", error);
        return res.status(500).send("Upload failed.");
    }

    res.send("File uploaded successfully.");
});

// Get list of files
app.get("/files", checkPassword, async (req, res) => {

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list();

    if (error) {
        console.error("Supabase list error:", error);
        return res.status(500).json([]);
    }

    const files = data.map(file => file.name);

    res.json(files);
});

// Download file
app.get("/download/:file", checkPassword, async (req, res) => {

    const fileName = req.params.file;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .download(fileName);

    if (error) {
        console.error("Supabase download error:", error);
        return res.status(404).send("File not found.");
    }

    res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`
    );

    res.send(Buffer.from(await data.arrayBuffer()));
});

// Delete file
app.get("/delete/:file", checkPassword, async (req, res) => {

    const fileName = req.params.file;

    const { error } = await supabase.storage
        .from(BUCKET)
        .remove([fileName]);

    if (error) {
        console.error("Supabase delete error:", error);
        return res.status(500).send("Delete failed.");
    }

    res.redirect("/?password=" + encodeURIComponent(PASSWORD));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
