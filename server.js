const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Folder where uploaded files will be stored
const uploadFolder = path.join(__dirname, "uploads");

// Create uploads folder if it doesn't exist
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

// File storage settings
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder);
    },

    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Show the website
app.use(express.static("public"));

// Upload a file
app.post("/upload", upload.single("file"), (req, res) => {
    res.redirect("/");
});

// Get list of files
app.get("/files", (req, res) => {
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            return res.json([]);
        }

        res.json(files);
    });
});

// Download a file
app.get("/download/:file", (req, res) => {
    const filePath = path.join(uploadFolder, req.params.file);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found.");
    }
});

// Delete a file
app.get("/delete/:file", (req, res) => {
    const filePath = path.join(uploadFolder, req.params.file);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.redirect("/");
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});