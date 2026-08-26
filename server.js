const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Password
const PASSWORD = process.env.PASSWORD || "change-me";

// Folder for uploaded files
const uploadFolder = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

// File storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadFolder);
    },

    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Simple password protection
function checkPassword(req, res, next) {
    const password = req.query.password;

    if (password === PASSWORD) {
        next();
    } else {
        res.status(401).send(`
            <h2>Password Required</h2>
            <form>
                <input type="password" name="password" placeholder="Password">
                <button type="submit">Login</button>
            </form>
        `);
    }
}

// Website
app.use(express.static("public"));

// Upload
app.post("/upload", checkPassword, upload.single("file"), (req, res) => {
    res.redirect("/?password=" + PASSWORD);
});

// List files
app.get("/files", checkPassword, (req, res) => {
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            return res.json([]);
        }

        res.json(files);
    });
});

// Download
app.get("/download/:file", checkPassword, (req, res) => {
    const filePath = path.join(uploadFolder, req.params.file);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found.");
    }
});

// Delete
app.get("/delete/:file", checkPassword, (req, res) => {
    const filePath = path.join(uploadFolder, req.params.file);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.redirect("/?password=" + PASSWORD);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
