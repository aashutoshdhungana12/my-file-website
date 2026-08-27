/* ================= GLOBAL VARIABLES ================= */

let accessPassword = "";

let fileToDelete = "";

let allFiles = [];

/*
 * IMPORTANT:
 * This array keeps files between multiple selections.
 *
 * Example:
 * Select 5 files
 * Then select 5 more
 * Result = 10 files
 */
let selectedFiles = [];

const MAX_FILES = 20;


/* ================= LOGIN ================= */

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


/* ================= ENTER KEY LOGIN ================= */

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


/* ================= LOAD FILES ================= */

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

            const actions =
                document.createElement("div");

            actions.className =
                "actions";

            /* DOWNLOAD */

            const download =
                document.createElement("a");

            download.className =
                "download";

            download.textContent =
                "Download";

            download.href =
                "/download/" +
                encodeURIComponent(
                    file.name
                ) +
                "?password=" +
                encodeURIComponent(
                    accessPassword
                );

            /* DELETE */

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


/* ================= MULTIPLE FILE SELECTION ================= */

document
    .getElementById("fileInput")
    .addEventListener(
        "change",
        function() {

            /*
             * Convert the newly selected FileList
             * into a normal array.
             */
            const newFiles =
                Array.from(this.files);

            if (newFiles.length === 0) {
                return;
            }

            /*
             * Calculate how many more files
             * can be selected.
             */
            const remaining =
                MAX_FILES -
                selectedFiles.length;

            if (remaining <= 0) {

                document.getElementById(
                    "uploadMessage"
                ).textContent =
                    "Maximum of 20 files can be selected at once.";

                /*
                 * Reset the input.
                 */
                this.value = "";

                return;
            }

            /*
             * Only add files that fit within
             * the 20-file limit.
             */
            const filesToAdd =
                newFiles.slice(
                    0,
                    remaining
                );

            selectedFiles =
                selectedFiles.concat(
                    filesToAdd
                );

            /*
             * If user selected more than
             * the remaining amount.
             */
            if (
                newFiles.length >
                remaining
            ) {

                document.getElementById(
                    "uploadMessage"
                ).textContent =
                    "Maximum of 20 files can be selected at once.";

            } else {

                document.getElementById(
                    "uploadMessage"
                ).textContent = "";

            }

            /*
             * Display the complete selection.
             */
            displaySelectedFiles();

            /*
             * VERY IMPORTANT:
             *
             * Clear the actual input.
             *
             * This allows the user to select
             * another batch of files.
             *
             * The files are NOT lost because
             * they are stored in selectedFiles.
             */
            this.value = "";

        }
    );


/* ================= DISPLAY SELECTED FILES ================= */

function displaySelectedFiles() {

    const selected =
        document.getElementById(
            "selectedFiles"
        );

    if (selectedFiles.length === 0) {

        selected.textContent =
            "No files selected.";

        return;
    }

    let html =
        '<span class="selected-file-count">' +
        selectedFiles.length +
        " file" +
        (
            selectedFiles.length === 1
                ? ""
                : "s"
        ) +
        " selected" +
        "</span>";

    html += "<br><br>";

    /*
     * Number files in the order
     * they were selected.
     */
    selectedFiles.forEach(
        function(file, index) {

            html +=
                '<span class="selected-file-name">' +
                (index + 1) +
                ". 📄 " +
                escapeHTML(file.name) +
                "</span>";

            if (
                index <
                selectedFiles.length - 1
            ) {

                html += "<br>";

            }

        }
    );

    selected.innerHTML =
        html;
}


/* ================= UPLOAD MULTIPLE FILES ================= */

document
    .getElementById("uploadForm")
    .addEventListener(
        "submit",
        async function(e) {

            e.preventDefault();

            const message =
                document.getElementById(
                    "uploadMessage"
                );

            const uploadButton =
                document.getElementById(
                    "uploadButton"
                );

            if (
                selectedFiles.length === 0
            ) {

                message.textContent =
                    "Please choose at least one file.";

                return;
            }

            /*
             * Create FormData.
             */
            const formData =
                new FormData();

            /*
             * Add EVERY file.
             *
             * The server expects:
             * files
             */
            selectedFiles.forEach(
                function(file) {

                    formData.append(
                        "files",
                        file
                    );

                }
            );

            message.textContent =
                "Uploading " +
                selectedFiles.length +
                " file" +
                (
                    selectedFiles.length === 1
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

                    /*
                     * Clear the selection
                     * ONLY after successful upload.
                     */
                    selectedFiles = [];

                    document
                        .getElementById(
                            "fileInput"
                        )
                        .value = "";

                    displaySelectedFiles();

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


/* ================= ESCAPE HTML ================= */

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}


/* ================= ADMIN PASSWORD ================= */

function openAdminPasswordModal() {

    const modal =
        document.getElementById(
            "adminPasswordModal"
        );

    const input =
        document.getElementById(
            "adminPassword"
        );

    const message =
        document.getElementById(
            "adminMessage"
        );

    message.textContent = "";

    input.value = "";

    modal.style.display =
        "flex";

    setTimeout(function() {
        input.focus();
    }, 100);

}


function closeAdminPasswordModal() {

    document
        .getElementById(
            "adminPasswordModal"
        )
        .style.display =
        "none";
}


async function verifyAdminPassword() {

    const input =
        document.getElementById(
            "adminPassword"
        );

    const message =
        document.getElementById(
            "adminMessage"
        );

    const password =
        input.value.trim();

    if (!password) {

        message.textContent =
            "Please enter the admin password.";

        return;
    }

    /*
     * We verify the admin password by
     * requesting the protected date
     * download endpoint.
     *
     * We do NOT expose the admin password
     * anywhere in the page.
     */
    message.textContent =
        "VERIFYING...";

    try {

        /*
         * Ask for today's date.
         *
         * We only need to determine whether
         * the server accepts the password.
         */
        const testDate =
            new Date();

        const year =
            testDate.getFullYear();

        const month =
            String(
                testDate.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                testDate.getDate()
            ).padStart(2, "0");

        /*
         * IMPORTANT:
         *
         * Your server currently uses the same
         * checkPassword middleware for the
         * /download-date endpoint.
         *
         * Therefore the ADMIN password needs
         * to be accepted by the server for this
         * endpoint.
         *
         * If your server has been changed so that
         * admin password is separate, use the
         * updated server.js that checks
         * DELETE_PASSWORD here.
         */

        const response =
            await fetch(
                "/download-date?date=" +
                year +
                "-" +
                month +
                "-" +
                day +
                "&password=" +
                encodeURIComponent(password)
            );

        /*
         * 404 means the password was accepted
         * but there were simply no files today.
         */
        if (
            response.ok ||
            response.status === 404
        ) {

            closeAdminPasswordModal();

            openDownloadModal();

            return;
        }

        message.textContent =
            "🔴 Incorrect admin password.";

        input.value = "";

        input.focus();

    } catch (error) {

        console.error(error);

        message.textContent =
            "Connection error. Try again.";
    }
}


/* ================= ADMIN PASSWORD ENTER ================= */

document
    .getElementById("adminPassword")
    .addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {
                verifyAdminPassword();
            }

        }
    );


/* ================= DOWNLOAD YOUR FILES ================= */

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


function closeDownloadModal() {

    document
        .getElementById(
            "downloadModal"
        )
        .style.display =
        "none";
}


/* ================= DATE LIST ================= */

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
                        ) === dateString;

                    }
                );

            button.innerHTML =
                '<div class="date-day">' +
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

                    downloadDate(
                        dateString
                    );

                };

            dateList.appendChild(
                button
            );

        }
    );
}


/* ================= DOWNLOAD DATE ================= */

function downloadDate(dateString) {

    const message =
        document.getElementById(
            "downloadMessage"
        );

    message.textContent =
        "Preparing download...";

    const url =
        "/download-date?date=" +
        encodeURIComponent(
            dateString
        ) +
        "&password=" +
        encodeURIComponent(
            document.getElementById(
                "adminPassword"
            ).value
        );

    /*
     * The admin password is stored
     * only temporarily while the
     * modal is being used.
     *
     * Use the password entered in the
     * admin modal.
     */
    const link =
        document.createElement("a");

    link.href =
        url;

    link.style.display =
        "none";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    message.textContent =
        "🟢 Download started.";
}


/* ================= DELETE ================= */

function openDeleteModal(fileName) {

    fileToDelete =
        fileName;

    const modal =
        document.getElementById(
            "deleteModal"
        );

    const input =
        document.getElementById(
            "deletePassword"
        );

    const message =
        document.getElementById(
            "deleteMessage"
        );

    input.value = "";

    message.textContent = "";

    modal.style.display =
        "flex";

    setTimeout(function() {

        input.focus();

    }, 100);
}


function closeDeleteModal() {

    document
        .getElementById(
            "deleteModal"
        )
        .style.display =
        "none";

    fileToDelete = "";
}


async function confirmDelete() {

    const password =
        document.getElementById(
            "deletePassword"
        ).value.trim();

    const message =
        document.getElementById(
            "deleteMessage"
        );

    if (!password) {

        message.textContent =
            "Please enter the deletion password.";

        return;
    }

    if (!fileToDelete) {

        message.textContent =
            "No file selected.";

        return;
    }

    message.textContent =
        "Deleting...";

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

            closeDeleteModal();

            await loadFiles();

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


/* ================= DELETE ENTER KEY ================= */

document
    .getElementById("deletePassword")
    .addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {
                confirmDelete();
            }

        }
    );


/* ================= FORMAT DATE ================= */

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
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


/* ================= FORMAT TIME ================= */

function formatTime(date) {

    if (
        !date ||
        isNaN(date.getTime())
    ) {

        return "Unknown time";

    }

    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


/* ================= FORMAT SIZE ================= */

function formatSize(bytes) {

    if (!bytes || bytes <= 0) {
        return "Unknown size";
    }

    const units =
        [
            "B",
            "KB",
            "MB",
            "GB",
            "TB"
        ];

    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    const size =
        bytes /
        Math.pow(
            1024,
            index
        );

    return (
        size.toFixed(
            index === 0
                ? 0
                : 2
        ) +
        " " +
        units[index]
    );
}


/* ================= LOGOUT ================= */

function logout() {

    accessPassword = "";

    selectedFiles = [];

    allFiles = [];

    fileToDelete = "";

    document
        .getElementById(
            "dashboard"
        )
        .style.display =
        "none";

    document
        .getElementById(
            "loginScreen"
        )
        .style.display =
        "flex";

    document
        .getElementById(
            "password"
        )
        .value = "";

    document
        .getElementById(
            "loginMessage"
        )
        .textContent = "";

    document
        .getElementById(
            "selectedFiles"
        )
        .textContent =
        "No files selected.";
}


/* ================= CLOSE MODALS BY CLICKING OUTSIDE ================= */

document
    .getElementById("downloadModal")
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                this
            ) {

                closeDownloadModal();

            }

        }
    );

document
    .getElementById("adminPasswordModal")
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                this
            ) {

                closeAdminPasswordModal();

            }

        }
    );

document
    .getElementById("deleteModal")
    .addEventListener(
        "click",
        function(event) {

            if (
                event.target ===
                this
            ) {

                closeDeleteModal();

            }

        }
    );
