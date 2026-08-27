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
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET;

// ======================================================
// SUPABASE
// ======================================================

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

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
// AUTHENTICATION HELPER
// ======================================================

function checkPassword(req) {
    const password =
        req.query.password ||
        req.body?.password;

    return password === PASSWORD;
}

function checkAdminPassword(password) {
    return password === ADMIN_PASSWORD;
}

// ======================================================
// LOGIN / FILE LIST
// ======================================================

app.get("/files", async (req, res) => {

    if (!checkPassword(req)) {
        return res.status(401).json({
            message: "Access denied."
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
            console.error(error);

            return res.status(500).json({
                message: "Unable to load files."
            });
        }

        const files = (data || []).map(file => ({
            name: file.name,
            originalName: file.name,
            size: file.metadata?.size || 0,
            createdAt:
                file.created_at ||
                file.updated_at
        }));

        res.json({
            files
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Server error."
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
                message: "Access denied."
            });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                message: "No files selected."
            });
        }

        try {

            const uploaded = [];

            for (const file of req.files) {

                const timestamp =
                    Date.now();

                const safeName =
                    `${timestamp}-${file.originalname}`;

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
                                upsert: false
                            }
                        );

                if (error) {

                    console.error(error);

                    return res.status(500).json({
                        message:
                            `Failed to upload ${file.originalname}.`
                    });
                }

                uploaded.push(safeName);
            }

            res.json({
                message:
                    `${uploaded.length} file${uploaded.length === 1 ? "" : "s"} uploaded successfully.`
            });

        } catch (error) {

            console.error(error);

            res.status(500).json({
                message: "Upload failed."
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

        try {

            const filename =
                req.params.filename;

            const { data, error } =
                await supabase
                    .storage
                    .from(SUPABASE_BUCKET)
                    .download(filename);

            if (error) {

                console.error(error);

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

            console.error(error);

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

        if (!checkAdminPassword(password)) {

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

        if (!checkAdminPassword(password)) {

            return res.status(401).send(
                "Incorrect admin password."
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

                console.error(error);

                return res.status(500).send(
                    "Unable to retrieve files."
                );
            }

            const filesForDate =
                (data || []).filter(file => {

                    if (!file.created_at) {
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
                        ).padStart(2, "0");

                    const day =
                        String(
                            fileDate.getDate()
                        ).padStart(2, "0");

                    return (
                        `${year}-${month}-${day}` ===
                        date
                    );
                });

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
                archiver("zip", {
                    zlib: {
                        level: 9
                    }
                });

            archive.on(
                "error",
                error => {

                    console.error(error);

                    if (!res.headersSent) {
                        res.status(500).end();
                    }
                }
            );

            archive.pipe(res);

            for (
                const file of filesForDate
            ) {

                const { data: fileData, error: downloadError } =
                    await supabase
                        .storage
                        .from(SUPABASE_BUCKET)
                        .download(file.name);

                if (downloadError) {

                    console.error(
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

            console.error(error);

            if (!res.headersSent) {

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

        if (!checkAdminPassword(password)) {

            return res.status(401).json({
                message:
                    "Incorrect admin password."
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

                console.error(error);

                return res.status(500).json({
                    message:
                        "Failed to delete file."
                });
            }

            res.json({
                message:
                    "File deleted successfully."
            });

        } catch (error) {

            console.error(error);

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

        console.log(
            `Server running on port ${PORT}`
        );

    }
);
