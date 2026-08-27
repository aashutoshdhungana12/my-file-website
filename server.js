const express = require("express");
const multer = require("multer");
const archiver = require("archiver");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;

// ======================================================
// ENVIRONMENT VARIABLES
// ======================================================

const PASSWORD = process.env.PASSWORD;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;

// ======================================================
// ENVIRONMENT CHECK
// ======================================================

console.log("========================================");
console.log("AASHUTOSH'S CLOUD STORAGE");
console.log("Starting server...");
console.log("========================================");

if (!PASSWORD) {
    console.error("ERROR: PASSWORD is missing.");
}

if (!ADMIN_PASSWORD) {
    console.error("ERROR: ADMIN_PASSWORD is missing.");
}

if (!SUPABASE_URL) {
    console.error("ERROR: SUPABASE_URL is missing.");
}

if (!SUPABASE_KEY) {
    console.error("ERROR: SUPABASE_SECRET_KEY is missing.");
}

if (!SUPABASE_BUCKET) {
    console.error("ERROR: SUPABASE_BUCKET is missing.");
}

if (
    SUPABASE_URL &&
    SUPABASE_KEY &&
    SUPABASE_BUCKET
) {
    console.log("Supabase configuration found.");
    console.log(
        "Supabase bucket:",
        SUPABASE_BUCKET
    );
}

// ======================================================
// SUPABASE
// ======================================================

let supabase = null;

if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );
}

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);

// ======================================================
// MULTER
// ======================================================

const upload = multer({
    storage: multer.memoryStorage()
});

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function checkPassword(req) {

    const password =
        req.query.password ||
        req.body?.password;

    return (
        PASSWORD &&
        password === PASSWORD
    );
}

function checkAdminPassword(password) {

    return (
        ADMIN_PASSWORD &&
        password === ADMIN_PASSWORD
    );
}

function storageReady() {

    return (
        supabase &&
        SUPABASE_BUCKET
    );
}

// ======================================================
// FILE LIST
// ======================================================

app.get("/files", async (req, res) => {

    if (!checkPassword(req)) {

        return res.status(401).json({
            message: "Access denied."
        });
    }

    if (!storageReady()) {

        return res.status(500).json({
            message:
                "Storage configuration is missing."
        });
    }

    try {

        const { data, error } =
            await supabase
                .storage
                .from(SUPABASE_BUCKET)
                .list("", {
                    limit: 1000,
                    sortBy: {
                        column: "created_at",
                        order: "desc"
                    }
                });

        if (error) {

            console.error(
                "SUPABASE LIST ERROR:",
                error
            );

            return res.status(500).json({
                message:
                    `Unable to load files: ${error.message}`
            });
        }

        const files =
            (data || []).map(file => ({

                name:
                    file.name,

                originalName:
                    file.name,

                size:
                    file.metadata?.size || 0,

                createdAt:
                    file.created_at ||
                    file.updated_at

            }));

        res.json({
            files
        });

    } catch (error) {

        console.error(
            "FILE LIST ERROR:",
            error
        );

        res.status(500).json({
            message:
                "Server error."
        });
    }
});

// ======================================================
// UPLOAD FILES
// ======================================================

app.post(
    "/upload",
    upload.array("files", 20),
    async (req, res) => {

        if (!checkPassword(req)) {

            return res.status(401).json({
                message:
                    "Access denied."
            });
        }

        if (!storageReady()) {

            return res.status(500).json({
                message:
                    "Storage configuration is missing."
            });
        }

        if (
            !req.files ||
            req.files.length === 0
        ) {

            return res.status(400).json({
                message:
                    "No files selected."
            });
        }

        try {

            const uploaded = [];

            for (
                const file of req.files
            ) {

                // --------------------------------------------------
                // SAFE FILENAME
                // --------------------------------------------------

                const originalName =
                    path
                        .basename(
                            file.originalname
                        )
                        .replace(
                            /[^a-zA-Z0-9._-]/g,
                            "_"
                        );

                const timestamp =
                    Date.now();

                const randomPart =
                    Math.random()
                        .toString(36)
                        .substring(2, 8);

                const safeName =
                    `${timestamp}-${randomPart}-${originalName}`;

                console.log(
                    `Uploading file: ${safeName}`
                );

                // --------------------------------------------------
                // SUPABASE UPLOAD
                // --------------------------------------------------

                const { error } =
                    await supabase
                        .storage
                        .from(SUPABASE_BUCKET)
                        .upload(
                            safeName,
                            file.buffer,
                            {
                                contentType:
                                    file.mimetype,

                                upsert:
                                    false
                            }
                        );

                if (error) {

                    console.error(
                        "SUPABASE UPLOAD ERROR:",
                        error
                    );

                    return res.status(500).json({

                        message:
                            `Failed to upload ${file.originalname}: ${error.message}`

                    });
                }

                uploaded.push(
                    safeName
                );
            }

            console.log(
                `${uploaded.length} file(s) uploaded successfully.`
            );

            res.json({

                message:
                    `${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded successfully.`

            });

        } catch (error) {

            console.error(
                "UPLOAD ERROR:",
                error
            );

            res.status(500).json({

                message:
                    `Upload failed: ${error.message}`

            });
        }
    }
);

// ======================================================
// INDIVIDUAL DOWNLOAD
// ======================================================

app.get(
    "/download/:filename",
    async (req, res) => {

        if (!checkPassword(req)) {

            return res.status(401).send(
                "Access denied."
            );
        }

        if (!storageReady()) {

            return res.status(500).send(
                "Storage configuration is missing."
            );
        }

        try {

            const filename =
                req.params.filename;

            const { data, error } =
                await supabase
                    .storage
                    .from(SUPABASE_BUCKET)
                    .download(
                        filename
                    );

            if (error) {

                console.error(
                    "SUPABASE DOWNLOAD ERROR:",
                    error
                );

                return res.status(404).send(
                    "File not found."
                );
            }

            const buffer =
                Buffer.from(
                    await data.arrayBuffer()
                );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${filename}"`
            );

            res.setHeader(
                "Content-Type",
                "application/octet-stream"
            );

            res.send(buffer);

        } catch (error) {

            console.error(
                "DOWNLOAD ERROR:",
                error
            );

            res.status(500).send(
                "Download failed."
            );
        }
    }
);

// ======================================================
// VERIFY ADMIN
// ======================================================

app.post(
    "/verify-admin",
    (req, res) => {

        const { password } =
            req.body;

        if (
            !checkAdminPassword(password)
        ) {

            return res.status(401).json({

                message:
                    "Incorrect admin password."

            });
        }

        res.json({

            message:
                "Admin verified."

        });
    }
);

// ======================================================
// DOWNLOAD FILES BY DATE
// ======================================================

app.post(
    "/download-date",
    async (req, res) => {

        const {
            password,
            date
        } = req.body;

        if (
            !checkAdminPassword(password)
        ) {

            return res.status(401).send(
                "Incorrect admin password."
            );
        }

        if (!storageReady()) {

            return res.status(500).send(
                "Storage configuration is missing."
            );
        }

        if (!date) {

            return res.status(400).send(
                "Date is required."
            );
        }

        try {

            const { data, error } =
                await supabase
                    .storage
                    .from(SUPABASE_BUCKET)
                    .list("", {
                        limit: 1000
                    });

            if (error) {

                console.error(
                    "SUPABASE LIST ERROR:",
                    error
                );

                return res.status(500).send(
                    `Unable to retrieve files: ${error.message}`
                );
            }

            const filesForDate =
                (data || []).filter(
                    file => {

                        if (
                            !file.created_at
                        ) {

                            return false;
                        }

                        const fileDate =
                            new Date(
                                file.created_at
                            );

                        const year =
                            fileDate.getFullYear();

                        const month =
                            String(
                                fileDate.getMonth() + 1
                            ).padStart(
                                2,
                                "0"
                            );

                        const day =
                            String(
                                fileDate.getDate()
                            ).padStart(
                                2,
                                "0"
                            );

                        return (
                            `${year}-${month}-${day}` ===
                            date
                        );
                    }
                );

            if (
                filesForDate.length === 0
            ) {

                return res.status(404).send(
                    "No files were uploaded on this date."
                );
            }

            res.setHeader(
                "Content-Type",
                "application/zip"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="Aashutosh-Files-${date}.zip"`
            );

            const archive =
                archiver(
                    "zip",
                    {
                        zlib: {
                            level: 9
                        }
                    }
                );

            archive.on(
                "error",
                error => {

                    console.error(
                        "ARCHIVE ERROR:",
                        error
                    );

                    if (
                        !res.headersSent
                    ) {

                        res.status(
                            500
                        ).end();

                    }
                }
            );

            archive.pipe(res);

            for (
                const file of filesForDate
            ) {

                const {
                    data: fileData,
                    error: downloadError
                } =
                    await supabase
                        .storage
                        .from(SUPABASE_BUCKET)
                        .download(
                            file.name
                        );

                if (
                    downloadError
                ) {

                    console.error(
                        "ZIP FILE DOWNLOAD ERROR:",
                        downloadError
                    );

                    continue;
                }

                const buffer =
                    Buffer.from(
                        await fileData.arrayBuffer()
                    );

                archive.append(
                    buffer,
                    {
                        name:
                            file.name
                    }
                );
            }

            await archive.finalize();

        } catch (error) {

            console.error(
                "ZIP DOWNLOAD ERROR:",
                error
            );

            if (
                !res.headersSent
            ) {

                res.status(500).send(
                    "ZIP download failed."
                );
            }
        }
    }
);

// ======================================================
// DELETE FILE
// ======================================================

app.post(
    "/delete",
    async (req, res) => {

        const {
            file,
            password
        } = req.body;

        if (
            !checkAdminPassword(password)
        ) {

            return res.status(401).json({

                message:
                    "Incorrect admin password."

            });
        }

        if (!storageReady()) {

            return res.status(500).json({

                message:
                    "Storage configuration is missing."

            });
        }

        if (!file) {

            return res.status(400).json({

                message:
                    "No file specified."

            });
        }

        try {

            const { error } =
                await supabase
                    .storage
                    .from(SUPABASE_BUCKET)
                    .remove([
                        file
                    ]);

            if (error) {

                console.error(
                    "SUPABASE DELETE ERROR:",
                    error
                );

                return res.status(500).json({

                    message:
                        `Failed to delete file: ${error.message}`

                });
            }

            res.json({

                message:
                    "File deleted successfully."

            });

        } catch (error) {

            console.error(
                "DELETE ERROR:",
                error
            );

            res.status(500).json({

                message:
                    "Delete failed."

            });
        }
    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    () => {

        console.log("========================================");
        console.log(
            `Server running on port ${PORT}`
        );

        if (SUPABASE_BUCKET) {

            console.log(
                `Storage bucket: ${SUPABASE_BUCKET}`
            );

        }

        console.log("========================================");

    }
);
