/* =========================================================
   AASHUTOSH'S CLOUD STORAGE
   FRONTEND JAVASCRIPT
   ========================================================= */


/* ================= GLOBAL VARIABLES ================= */

let accessPassword = "";

let fileToDelete = "";

let allFiles = [];

let adminDownloadPassword = "";


/* =========================================================
   LOGIN
   ========================================================= */

async function login() {

    const input =
        document.getElementById("password");

    const message =
        document.getElementById("loginMessage");

    const password =
        input.value.trim();

    if (!password) {

        message.textContent =
            "Please enter your password.";

        message.className =
            "denied";

        return;
    }

    message.textContent =
        "AUTHENTICATING...";

    message.className = "";

    try {

        const response =
            await fetch(
                "/files?password=" +
                encodeURIComponent(password)
            );

        if (!response.ok) {

            message.textContent =
                "🔴 ACCESS DENIED";

            message.className =
                "denied";

            input.value = "";

            input.focus();

            return;
        }

        accessPassword =
            password;

        message.textContent =
            "🟢 ACCESS GRANTED";

        message.className =
            "granted";

        setTimeout(function() {

            document
                .getElementById("loginScreen")
                .style.display = "none";

            document
                .getElementById("dashboard")
                .style.display = "block";

            loadFiles();

        }, 700);

    } catch (error) {

        console.error(error);

        message.textContent =
            "Connection error. Try again.";

        message.className =
            "denied";
    }
}


/* =========================================================
   ENTER KEY LOGIN
   ========================================================= */

document
    .getElementById("password")
    .addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                login();

            }

        }
    );


/* =========================================================
   LOGOUT
   ========================================================= */

function logout() {

    accessPassword = "";

    adminDownloadPassword = "";

    allFiles = [];

    fileToDelete = "";

    document
        .getElementById("dashboard")
        .style.display = "none";

    document
        .getElementById("loginScreen")
        .style.display = "flex";

    document
        .getElementById("password")
        .value = "";

    document
        .getElementById("loginMessage")
        .textContent = "";

    closeDownloadModal();

    closeAdminDownloadAuth();

    closeDeleteModal();
}


/* =========================================================
   LOAD FILES
   ========================================================= */

async function loadFiles() {

    const list =
        document.getElementById("fileList");

    list.innerHTML =
        '<div class="empty">Loading files...</div>';

    try {

        const response =
            await fetch(
                "/files?password=" +
                encodeURIComponent(
                    accessPassword
                )
            );

        if (!response.ok) {

            logout();

            return;
        }

        const result =
            await response.json();

        const files =
            result.files || [];

        allFiles =
            files;

        list.innerHTML = "";

        if (files.length === 0) {

            list.innerHTML =
                '<div class="empty">📂 No files uploaded yet.</div>';

            return;
        }

        files.forEach(function(file) {

            const card =
                document.createElement("div");

            card.className =
                "file-card";


            /* ================= FILE INFO ================= */

            const info =
                document.createElement("div");

            info.className =
                "file-info";


            const name =
                document.createElement("div");

            name.className =
                "file-name";

            name.textContent =
                "📄 " +
                file.originalName;


            const meta =
                document.createElement("div");

            meta.className =
                "file-meta";

            const date =
                new Date(
                    file.createdAt
                );

            meta.textContent =
                formatDate(date) +
                " • " +
                formatTime(date) +
                " • " +
                formatSize(file.size);


            info.appendChild(name);

            info.appendChild(meta);


            /* ================= ACTIONS ================= */

            const actions =
                document.createElement("div");

            actions.className =
                "actions";


            /* ================= DOWNLOAD ================= */

            const download =
                document.createElement("a");

            download.className =
                "download";

            download.textContent =
                "📥 Download";

            download.href =
                "/download/" +
                encodeURIComponent(
                    file.name
                ) +
                "?password=" +
                encodeURIComponent(
                    accessPassword
                );


            /* ================= DELETE ================= */

            const deleteButton =
                document.createElement("button");

            deleteButton.className =
                "delete";

            deleteButton.textContent =
                "🗑️ Delete";

            deleteButton.onclick =
                function() {

                    openDeleteModal(
                        file.name
                    );

                };


            actions.appendChild(
                download
            );

            actions.appendChild(
                deleteButton
            );


            card.appendChild(info);

            card.appendChild(actions);

            list.appendChild(card);

        });

    } catch (error) {

        console.error(error);

        list.innerHTML =
            '<div class="empty">Unable to load files.</div>';
    }
}


/* =========================================================
   MULTIPLE FILE SELECTION
   ========================================================= */

document
    .getElementById("fileInput")
    .addEventListener(
        "change",
        function() {

            const files =
                Array.from(this.files);

            const selected =
                document.getElementById(
                    "selectedFiles"
                );


            /* ================= NO FILES ================= */

            if (files.length === 0) {

                selected.textContent =
                    "Maximum of 20 files can be selected at once.";

                return;
            }


            /* ================= MAXIMUM ================= */

            if (files.length > 20) {

                selected.innerHTML =
                    '<span class="selected-file-count">' +
                    "Maximum of 20 files can be selected at once." +
                    "</span>" +
                    "<br>" +
                    "Please select 20 files or fewer.";

                this.value = "";

                return;
            }


            /* ================= COUNT ================= */

            let html =
                '<span class="selected-file-count">' +
                files.length +
                " file" +
                (
                    files.length === 1
                        ? ""
                        : "s"
                ) +
                " selected" +
                "</span>";


            html += "<br><br>";


            /* ================= NUMBER FILES ================= */

            files.forEach(
                function(file, index) {

                    html +=
                        '<span class="selected-file-name">' +
                        (index + 1) +
                        ". 📄 " +
                        escapeHTML(file.name) +
                        "</span>";

                    if (
                        index <
                        files.length - 1
                    ) {

                        html += "<br>";

                    }

                }
            );


            selected.innerHTML =
                html;

        }
    );


/* =========================================================
   UPLOAD MULTIPLE FILES
   ========================================================= */

document
    .getElementById("uploadForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const input =
                document.getElementById(
                    "fileInput"
                );

            const message =
                document.getElementById(
                    "uploadMessage"
                );

            const uploadButton =
                document.getElementById(
                    "uploadButton"
                );

            const files =
                Array.from(input.files);


            /* ================= CHECK ================= */

            if (files.length === 0) {

                message.textContent =
                    "Please choose at least one file.";

                return;
            }


            if (files.length > 20) {

                message.textContent =
                    "Maximum of 20 files can be selected at once.";

                return;
            }


            /* ================= FORM DATA ================= */

            const formData =
                new FormData();


            /*
             * IMPORTANT:
             *
             * Every selected file is added
             * using the SAME field name:
             *
             * "files"
             *
             * This matches:
             *
             * upload.array("files", 20)
             *
             * on the server.
             */

            files.forEach(
                function(file) {

                    formData.append(
                        "files",
                        file
                    );

                }
            );


            /* ================= UI ================= */

            message.textContent =
                "Uploading " +
                files.length +
                " file" +
                (
                    files.length === 1
                        ? ""
                        : "s"
                ) +
                "...";

            uploadButton.disabled =
                true;

            uploadButton.textContent =
                "Uploading...";


            try {

                const response =
                    await fetch(
                        "/upload?password=" +
                        encodeURIComponent(
                            accessPassword
                        ),
                        {
                            method: "POST",
                            body: formData
                        }
                    );


                const result =
                    await response.json();


                if (response.ok) {

                    message.textContent =
                        "🟢 " +
                        result.message;


                    input.value = "";


                    document
                        .getElementById(
                            "selectedFiles"
                        )
                        .textContent =
                        "Maximum of 20 files can be selected at once.";


                    await loadFiles();


                } else {

                    message.textContent =
                        "🔴 " +
                        (
                            result.message ||
                            "Upload failed."
                        );

                }


            } catch (error) {

                console.error(error);

                message.textContent =
                    "🔴 Connection error.";

            } finally {

                uploadButton.disabled =
                    false;

                uploadButton.textContent =
                    "Upload";

            }

        }
    );


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


/* =========================================================
   ADMIN DOWNLOAD AUTHENTICATION
   ========================================================= */

/*
 * User clicks:
 *
 * 📥 DOWNLOAD YOUR FILES
 *
 * It does NOT directly open the date menu.
 *
 * It first opens the admin authentication popup.
 */

function openAdminDownloadAuth() {

    const modal =
        document.getElementById(
            "adminDownloadModal"
        );

    const password =
        document.getElementById(
            "adminDownloadPassword"
        );

    const message =
        document.getElementById(
            "adminDownloadMessage"
        );


    password.value = "";

    message.textContent = "";

    modal.style.display =
        "flex";


    setTimeout(
        function() {

            password.focus();

        },
        100
    );
}


/* ================= CLOSE ADMIN AUTH ================= */

function closeAdminDownloadAuth() {

    document
        .getElementById(
            "adminDownloadModal"
        )
        .style.display =
        "none";
}


/* ================= VERIFY ADMIN PASSWORD ================= */

async function verifyAdminDownload() {

    const password =
        document
            .getElementById(
                "adminDownloadPassword"
            )
            .value
            .trim();

    const message =
        document.getElementById(
            "adminDownloadMessage"
        );


    if (!password) {

        message.textContent =
            "⚠️ Please enter the admin password.";

        return;
    }


    message.textContent =
        "🔐 Verifying admin access...";


    try {

        /*
         * We contact the admin-protected
         * download endpoint.
         *
         * An intentionally invalid date is used.
         *
         * If the server returns:
         *
         * 401 = wrong admin password
         *
         * 400 = password accepted,
         *       date is invalid
         *
         * 404 = password accepted,
         *       no files on that date
         *
         * Therefore 400 or 404 means
         * authentication succeeded.
         */

        const response =
            await fetch(
                "/download-date?password=" +
                encodeURIComponent(password) +
                "&date=invalid"
            );


        /* ================= WRONG PASSWORD ================= */

        if (response.status === 401) {

            message.textContent =
                "🔴 Incorrect admin password.";

            return;
        }


        /*
         * The server accepted the password.
         */

        if (
            response.status === 400 ||
            response.status === 404
        ) {

            adminDownloadPassword =
                password;

            closeAdminDownloadAuth();


            setTimeout(
                function() {

                    openDownloadModal();

                },
                150
            );

            return;
        }


        message.textContent =
            "🔴 Admin verification failed.";

    } catch (error) {

        console.error(error);

        message.textContent =
            "🔴 Connection error. Please try again.";
    }
}


/* =========================================================
   ADMIN PASSWORD ENTER KEY
   ========================================================= */

document
    .getElementById(
        "adminDownloadPassword"
    )
    .addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                verifyAdminDownload();

            }

        }
    );


/* =========================================================
   DOWNLOAD YOUR FILES MODAL
   ========================================================= */

function openDownloadModal() {

    const modal =
        document.getElementById(
            "downloadModal"
        );

    const message =
        document.getElementById(
            "downloadMessage"
        );


    message.textContent = "";

    modal.style.display =
        "flex";


    buildDateList();
}


/* ================= CLOSE ================= */

function closeDownloadModal() {

    document
        .getElementById(
            "downloadModal"
        )
        .style.display =
        "none";
}


/* =========================================================
   BUILD DATE LIST
   ========================================================= */

function buildDateList() {

    const dateList =
        document.getElementById(
            "dateList"
        );


    dateList.innerHTML = "";


    if (!allFiles.length) {

        dateList.innerHTML =
            '<div class="empty">No uploaded files available.</div>';

        return;
    }


    const dates = {};


    allFiles.forEach(
        function(file) {

            if (!file.createdAt) {
                return;
            }


            const date =
                new Date(
                    file.createdAt
                );


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


            const key =
                year +
                "-" +
                month +
                "-" +
                day;


            dates[key] = true;

        }
    );


    const sortedDates =
        Object.keys(dates).sort(
            function(a, b) {

                return b.localeCompare(a);

            }
        );


    sortedDates.forEach(
        function(dateString) {

            const date =
                new Date(
                    dateString +
                    "T00:00:00"
                );


            const button =
                document.createElement(
                    "button"
                );

            button.className =
                "date-button";


            const dayName =
                date.toLocaleDateString(
                    "en-US",
                    {
                        weekday: "long"
                    }
                );


            const fullDate =
                date.toLocaleDateString(
                    "en-US",
                    {
                        month: "long",
                        day: "numeric",
                        year: "numeric"
                    }
                );


            const filesOnDate =
                allFiles.filter(
                    function(file) {

                        if (!file.createdAt) {
                            return false;
                        }


                        const fileDate =
                            new Date(
                                file.createdAt
                            );


                        const y =
                            fileDate.getFullYear();

                        const m =
                            String(
                                fileDate.getMonth() + 1
                            ).padStart(2, "0");

                        const d =
                            String(
                                fileDate.getDate()
                            ).padStart(2, "0");


                        return (
                            y +
                            "-" +
                            m +
                            "-" +
                            d
                        ) ===
                        dateString;

                    }
                );


            button.innerHTML =
                '<div class="date-day">' +
                "📅 " +
                dayName +
                "</div>" +

                '<div class="date-number">' +
                fullDate +
                " • " +
                filesOnDate.length +
                " file" +
                (
                    filesOnDate.length === 1
                        ? ""
                        : "s"
                ) +
                "</div>";


            button.onclick =
                function() {

                    downloadFilesByDate(
                        dateString
                    );

                };


            dateList.appendChild(
                button
            );

        }
    );
}


/* =========================================================
   DOWNLOAD FILES BY DATE
   ========================================================= */

async function downloadFilesByDate(
    dateString
) {

    const message =
        document.getElementById(
            "downloadMessage"
        );


    if (!adminDownloadPassword) {

        closeDownloadModal();

        openAdminDownloadAuth();

        return;
    }


    message.textContent =
        "📦 Preparing your files...";


    try {

        const response =
            await fetch(
                "/download-date?password=" +
                encodeURIComponent(
                    adminDownloadPassword
                ) +
                "&date=" +
                encodeURIComponent(
                    dateString
                )
            );


        if (response.status === 401) {

            adminDownloadPassword = "";

            closeDownloadModal();

            openAdminDownloadAuth();

            document
                .getElementById(
                    "adminDownloadMessage"
                )
                .textContent =
                "🔴 Admin authentication expired.";

            return;
        }


        if (!response.ok) {

            let errorMessage =
                "Could not create the download.";

            try {

                errorMessage =
                    await response.text();

            } catch (error) {

                console.error(error);

            }

            message.textContent =
                "🔴 " +
                errorMessage;

            return;
        }


        /*
         * Receive ZIP as a Blob.
         */

        const blob =
            await response.blob();


        /*
         * Create a temporary download link.
         */

        const url =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        link.download =
            "Aashutosh-Files-" +
            dateString +
            ".zip";


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        window.URL.revokeObjectURL(
            url
        );


        message.textContent =
            "🟢 Download ready.";


    } catch (error) {

        console.error(error);

        message.textContent =
            "🔴 Connection error.";

    }
}


/* =========================================================
   DELETE MODAL
   ========================================================= */

function openDeleteModal(fileName) {

    fileToDelete =
        fileName;


    const modal =
        document.getElementById(
            "deleteModal"
        );

    const password =
        document.getElementById(
            "deletePassword"
        );

    const message =
        document.getElementById(
            "deleteMessage"
        );


    password.value = "";

    message.textContent = "";

    modal.style.display =
        "flex";


    setTimeout(
        function() {

            password.focus();

        },
        100
    );
}


/* ================= CLOSE DELETE ================= */

function closeDeleteModal() {

    document
        .getElementById(
            "deleteModal"
        )
        .style.display =
        "none";


    fileToDelete = "";
}


/* =========================================================
   CONFIRM DELETE
   ========================================================= */

async function confirmDelete() {

    const password =
        document
            .getElementById(
                "deletePassword"
            )
            .value
            .trim();

    const message =
        document.getElementById(
            "deleteMessage"
        );


    if (!password) {

        message.textContent =
            "⚠️ Please enter the admin password.";

        return;
    }


    if (!fileToDelete) {

        message.textContent =
            "🔴 No file selected.";

        return;
    }


    message.textContent =
        "🛡️ Verifying admin access...";


    try {

        const response =
            await fetch(
                "/delete",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            file:
                                fileToDelete,

                            password:
                                password

                        })
                }
            );


        const result =
            await response.json();


        if (response.ok) {

            message.textContent =
                "🟢 File deleted successfully.";


            setTimeout(
                async function() {

                    closeDeleteModal();

                    await loadFiles();

                },
                700
            );


        } else {

            message.textContent =
                "🔴 " +
                (
                    result.message ||
                    "Delete failed."
                );

        }


    } catch (error) {

        console.error(error);

        message.textContent =
            "🔴 Connection error.";

    }
}


/* =========================================================
   DELETE PASSWORD ENTER KEY
   ========================================================= */

document
    .getElementById(
        "deletePassword"
    )
    .addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                confirmDelete();

            }

        }
    );


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(date) {

    if (
        !date ||
        isNaN(date.getTime())
    ) {

        return "Unknown date";

    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );
}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(date) {

    if (
        !date ||
        isNaN(date.getTime())
    ) {

        return "";

    }


    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


/* =========================================================
   FORMAT FILE SIZE
   ========================================================= */

function formatSize(bytes) {

    if (!bytes || bytes === 0) {

        return "Unknown size";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB",
        "TB"
    ];


    let size =
        Number(bytes);

    let index = 0;


    while (
        size >= 1024 &&
        index < units.length - 1
    ) {

        size =
            size / 1024;

        index++;

    }


    return (
        size < 10
            ? size.toFixed(1)
            : Math.round(size)
    ) +
    " " +
    units[index];
}


/* =========================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
   ========================================================= */

document
    .getElementById(
        "adminDownloadModal"
    )
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target === this
            ) {

                closeAdminDownloadAuth();

            }

        }
    );


document
    .getElementById(
        "downloadModal"
    )
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target === this
            ) {

                closeDownloadModal();

            }

        }
    );


document
    .getElementById(
        "deleteModal"
    )
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target === this
            ) {

                closeDeleteModal();

            }

        }
    );
