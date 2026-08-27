const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ==================== ENVIRONMENT VARIABLES ====================

const PASSWORD = process.env.PASSWORD;
const DELETE_PASSWORD = process.env.DELETE_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!PASSWORD) {
    console.error("ERROR: PASSWORD is missing.");
    process.exit(1);
}

if (!DELETE_PASSWORD) {
    console.error("ERROR: DELETE_PASSWORD is missing.");
    process.exit(1);
}

if (!SUPABASE_URL) {
    console.error("ERROR: SUPABASE_URL is missing.");
    process.exit(1);
}

if (!SUPABASE_SECRET_KEY) {
    console.error("ERROR: SUPABASE_SECRET_KEY is missing.");
    process.exit(1);
}

// ==================== SUPABASE ====================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
);

const BUCKET = "files";

// ==================== MULTER ====================

const upload = multer({
    storage: multer.memoryStorage()
});

// ==================== MIDDLEWARE ====================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ==================== PASSWORD CHECK ====================

function checkPassword(req, res, next) {

    if (req.query.password !== PASSWORD) {

        return res.status(401).json({
            success: false,
            message: "Incorrect password."
        });
    }

    next();
}

// ==================== GET ALL FILE DATA ====================

async function getAllFiles() {

    const result = await supabase.storage
        .from(BUCKET)
        .list("", {
            limit: 1000,
            offset: 0,
            sortBy: {
                column: "created_at",
                order: "desc"
            }
        });

    if (result.error) {
        throw result.error;
    }

    const data = result.data || [];

    const files = data
        .filter(function(file) {
            return file.name;
        })
        .map(function(file) {

            let originalName = file.name;

            originalName = originalName.replace(
                /^\d+-[a-z0-9]+-/,
                ""
            );

            let size = 0;

            if (
                file.metadata &&
                file.metadata.size
            ) {
                size = file.metadata.size;
            }

            return {
                name: file.name,
                originalName: originalName,
                createdAt:
                    file.created_at ||
                    file.updated_at,
                size: size
            };
        });

    files.sort(function(a, b) {

        return (
            new Date(b.createdAt) -
            new Date(a.createdAt)
        );

    });

    return files;
}

// ==================== UPLOAD ====================

app.post(
    "/upload",
    checkPassword,
    upload.single("file"),
    async function(req, res) {

        try {

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message: "No file selected."
                });
            }

            const originalName =
                path.basename(
                    req.file.originalname
                );

            const randomID =
                Math.random()
                    .toString(36)
                    .substring(2, 8);

            const fileName =
                Date.now() +
                "-" +
                randomID +
                "-" +
                originalName;

            const result =
                await supabase.storage
                    .from(BUCKET)
                    .upload(
                        fileName,
                        req.file.buffer,
                        {
                            contentType:
                                req.file.mimetype,
                            upsert: false
                        }
                    );

            if (result.error) {

                console.error(
                    "Supabase upload error:",
                    result.error
                );

                return res.status(500).json({
                    success: false,
                    message: "Upload failed."
                });
            }

            console.log(
                "File uploaded: " +
                fileName
            );

            res.json({
                success: true,
                message:
                    "File uploaded successfully."
            });

        } catch (error) {

            console.error(
                "Upload error:",
                error
            );

            res.status(500).json({
                success: false,
                message: "Upload failed."
            });
        }
    }
);

// ==================== LIST FILES ====================

app.get(
    "/files",
    checkPassword,
    async function(req, res) {

        try {

            const files =
                await getAllFiles();

            res.json({
                success: true,
                files: files
            });

        } catch (error) {

            console.error(
                "Files error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Could not load files."
            });
        }
    }
);

// ==================== DOWNLOAD INDIVIDUAL FILE ====================

app.get(
    "/download/:file",
    checkPassword,
    async function(req, res) {

        try {

            const fileName =
                req.params.file;

            const result =
                await supabase.storage
                    .from(BUCKET)
                    .download(fileName);

            if (result.error) {

                console.error(
                    "Supabase download error:",
                    result.error
                );

                return res
                    .status(404)
                    .send("File not found.");
            }

            let originalName =
                fileName;

            originalName =
                originalName.replace(
                    /^\d+-[a-z0-9]+-/,
                    ""
                );

            res.setHeader(
                "Content-Disposition",
                "attachment; filename=\"" +
                originalName +
                "\""
            );

            const buffer =
                Buffer.from(
                    await result.data.arrayBuffer()
                );

            res.send(buffer);

        } catch (error) {

            console.error(
                "Download error:",
                error
            );

            res
                .status(500)
                .send("Download failed.");
        }
    }
);

// ==================== DOWNLOAD FILES BY DATE ====================

app.get(
    "/download-date",
    checkPassword,
    async function(req, res) {

        try {

            const selectedDate =
                req.query.date;

            if (!selectedDate) {

                return res.status(400).send(
                    "Date is required."
                );
            }

            // Expected format: YYYY-MM-DD

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    selectedDate
                )
            ) {

                return res.status(400).send(
                    "Invalid date."
                );
            }

            const files =
                await getAllFiles();

            const matchingFiles =
                files.filter(function(file) {

                    if (!file.createdAt) {
                        return false;
                    }

                    const date =
                        new Date(file.createdAt);

                    const year =
                        date.getFullYear();

                    const month =
                        String(
                            date.getMonth() + 1
                        ).padStart(2, "0");

                    const day =
                        String(
                            date.getDate()
                        ).padStart(2, "0");

                    const fileDate =
                        year +
                        "-" +
                        month +
                        "-" +
                        day;

                    return (
                        fileDate ===
                        selectedDate
                    );
                });

            if (matchingFiles.length === 0) {

                return res.status(404).send(
                    "No files were uploaded on this date."
                );
            }

            // Create ZIP

            const archive =
                archiver("zip", {
                    zlib: {
                        level: 9
                    }
                });

            const formattedDate =
                selectedDate;

            res.setHeader(
                "Content-Type",
                "application/zip"
            );

            res.setHeader(
                "Content-Disposition",
                "attachment; filename=\"Aashutosh-Files-" +
                formattedDate +
                ".zip\""
            );

            archive.on(
                "error",
                function(error) {

                    console.error(
                        "Archive error:",
                        error
                    );

                    if (!res.headersSent) {
                        res.status(500).send(
                            "Could not create download."
                        );
                    }
                }
            );

            archive.pipe(res);

            for (
                const file of matchingFiles
            ) {

                try {

                    const result =
                        await supabase.storage
                            .from(BUCKET)
                            .download(
                                file.name
                            );

                    if (result.error) {

                        console.error(
                            "Could not download:",
                            file.name,
                            result.error
                        );

                        continue;
                    }

                    const buffer =
                        Buffer.from(
                            await result.data.arrayBuffer()
                        );

                    archive.append(
                        buffer,
                        {
                            name:
                                file.originalName
                        }
                    );

                } catch (error) {

                    console.error(
                        "Error adding file:",
                        file.name,
                        error
                    );
                }
            }

            await archive.finalize();

        } catch (error) {

            console.error(
                "Date download error:",
                error
            );

            if (!res.headersSent) {

                res
                    .status(500)
                    .send(
                        "Could not create download."
                    );
            }
        }
    }
);

// ==================== DELETE ====================

app.post(
    "/delete",
    async function(req, res) {

        try {

            const file =
                req.body.file;

            const password =
                req.body.password;

            if (!password) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Deletion password required."
                });
            }

            if (
                password !==
                DELETE_PASSWORD
            ) {

                return res.status(401).json({
                    success: false,
                    message:
                        "Incorrect deletion password."
                });
            }

            if (!file) {

                return res.status(400).json({
                    success: false,
                    message:
                        "No file specified."
                });
            }

            const result =
                await supabase.storage
                    .from(BUCKET)
                    .remove([file]);

            if (result.error) {

                console.error(
                    "Supabase delete error:",
                    result.error
                );

                return res.status(500).json({
                    success: false,
                    message:
                        "Delete failed."
                });
            }

            console.log(
                "File deleted: " +
                file
            );

            res.json({
                success: true,
                message:
                    "File deleted successfully."
            });

        } catch (error) {

            console.error(
                "Delete error:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Delete failed."
            });
        }
    }
);

// ==================== HEALTH CHECK ====================

app.get(
    "/health",
    function(req, res) {

        res.json({
            status: "online"
        });

    }
);

// ==================== START SERVER ====================

app.listen(
    PORT,
    "0.0.0.0",
    function() {

        console.log(
            "Server running on port " +
            PORT
        );

    }
);
