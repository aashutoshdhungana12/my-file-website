/* =========================================================
   AASHUTOSH'S CLOUD STORAGE
   FRONTEND JAVASCRIPT
   ========================================================= */


/* ================= GLOBAL VARIABLES ================= */

let accessPassword = "";

let fileToDelete = "";

let allFiles = [];

/*
 * This is the important part for multiple selection.
 *
 * We DON'T rely only on input.files.
 * Instead, we keep our own array of selected files.
 *
 * This allows:
 *
 * Choose 10 files
 * -> Choose another 10 files
 * -> All 20 stay selected
 */
let selectedFiles = [];


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

        /*
         * We check the password by requesting
         * the protected files endpoint.
         */
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

        /*
         * Password is correct.
         */
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

        console.error(
            "Login error:",
            error
        );

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

    allFiles = [];

    selectedFiles = [];

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

    clearSelectedFiles();

    document
        .getElementById("fileList")
        .innerHTML = "";

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

        /*
         * If the password is no longer valid,
         * return to login.
         */
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

            download.setAttribute(
                "download",
                ""
            );


            /* ================= DELETE ================= */

            const deleteButton =
                document.createElement("button");

            deleteButton.className =
                "delete";

            deleteButton.textContent =
                "Delete";

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

        console.error(
            "Load files error:",
            error
        );

        list.innerHTML =
            '<div class="empty">Unable to load files.</div>';
    }
}


/* =========================================================
   MULTIPLE FILE SELECTION
   ========================================================= */

/*
 * When the user chooses files:
 *
 * selectedFiles already contains previous selections.
 *
 * We add the new files to it instead of replacing them.
 */

document
    .getElementById("fileInput")
    .addEventListener(
        "change",
        function(event) {

            const newlySelectedFiles =
                Array.from(
                    event.target.files
                );


            if (
                newlySelectedFiles.length === 0
            ) {

                return;

            }


            /*
             * Maximum total selection:
             * 20 files.
             */

            const remainingSlots =
                20 -
                selectedFiles.length;


            if (remainingSlots <= 0) {

                showUploadMessage(
                    "You already have 20 files selected.",
                    true
                );

                /*
                 * Reset the actual input so
                 * the user can open it again.
                 */
                event.target.value = "";

                return;
            }


            /*
             * Only add files that fit within
             * the 20-file limit.
             */

            const filesToAdd =
                newlySelectedFiles.slice(
                    0,
                    remainingSlots
                );


            /*
             * Add files to our permanent
             * selection array.
             */

            filesToAdd.forEach(
                function(file) {

                    /*
                     * Prevent the same file from
                     * being added twice when the
                     * user chooses it again.
                     *
                     * We compare:
                     * name + size + lastModified
                     */

                    const alreadySelected =
                        selectedFiles.some(
                            function(existingFile) {

                                return (
                                    existingFile.name ===
                                        file.name &&
                                    existingFile.size ===
                                        file.size &&
                                    existingFile.lastModified ===
                                        file.lastModified
                                );

                            }
                        );


                    if (!alreadySelected) {

                        selectedFiles.push(file);

                    }

                }
            );


            /*
             * Reset the input.
             *
             * This is VERY important.
             *
             * It allows the user to select
             * the same file picker again.
             */

            event.target.value = "";


            updateSelectedFilesDisplay();

        }
    );


/* =========================================================
   UPDATE SELECTED FILE DISPLAY
   ========================================================= */

function updateSelectedFilesDisplay() {

    const selected =
        document.getElementById(
            "selectedFiles"
        );


    if (
        selectedFiles.length === 0
    ) {

        selected.innerHTML =
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


    selectedFiles.forEach(
        function(file, index) {

            html +=
                '<span class="selected-file-name">' +
                "📄 " +
                escapeHTML(file.name) +
                "</span>";

        }
    );


    selected.innerHTML =
        html;
}


/* =========================================================
   CLEAR SELECTED FILES
   ========================================================= */

function clearSelectedFiles() {

    selectedFiles = [];


    const input =
        document.getElementById(
            "fileInput"
        );

    input.value = "";


    const selected =
        document.getElementById(
            "selectedFiles"
        );

    selected.textContent =
        "No files selected.";
}


/* =========================================================
   UPLOAD MULTIPLE FILES
   ========================================================= */

document
    .getElementById("uploadForm")
    .addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();


            const message =
                document.getElementById(
                    "uploadMessage"
                );

            const uploadButton =
                document.getElementById(
                    "uploadButton"
                );


            /*
             * Use our selectedFiles array.
             *
             * NOT input.files.
             */

            if (
                selectedFiles.length === 0
            ) {

                message.textContent =
                    "Please choose at least one file.";

                return;
            }


            if (
                selectedFiles.length > 20
            ) {

                message.textContent =
                    "You can upload a maximum of 20 files at once.";

                return;
            }


            /*
             * Create FormData.
             */

            const formData =
                new FormData();


            /*
             * Add EVERY selected file
             * using the field name "files".
             *
             * This matches:
             *
             * upload.array("files", 20)
             *
             * in server.js.
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


                let result;

                try {

                    result =
                        await response.json();

                } catch (error) {

                    result = {
                        message:
                            "Server returned an invalid response."
                    };

                }


                if (response.ok) {

                    message.textContent =
                        "🟢 " +
                        (
                            result.message ||
                            "Files uploaded successfully."
                        );


                    /*
                     * Clear the selected files
                     * only AFTER successful upload.
                     */

                    clearSelectedFiles();


                    /*
                     * Reload the file list.
                     */

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

                console.error(
                    "Upload error:",
                    error
                );

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
   UPLOAD MESSAGE
   ========================================================= */

function showUploadMessage(
    text,
    isError
) {

    const message =
        document.getElementById(
            "uploadMessage"
        );

    message.textContent =
        text;

    if (isError) {

        message.style.color =
            "#ff5966";

    } else {

        message.style.color =
            "#36e38b";

    }
}


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
   FORMAT FILE SIZE
   ========================================================= */

function formatSize(bytes) {

    if (!bytes) {
        return "0 B";
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

    let index =
        0;


    while (
        size >= 1024 &&
        index < units.length - 1
    ) {

        size =
            size / 1024;

        index++;

    }


    return (
        size.toFixed(
            size >= 10 || index === 0
                ? 0
                : 1
        ) +
        " " +
        units[index]
    );
}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(date) {

    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );
}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(date) {

    return date.toLocaleTimeString(
        "en-US",
        {
            hour: "numeric",
            minute: "2-digit"
        }
    );
}


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


    if (
        !allFiles.length
    ) {

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
                escapeHTML(dayName) +
                "</div>" +

                '<div class="date-number">' +
                escapeHTML(fullDate) +
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

                    downloadByDate(
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
   DOWNLOAD BY DATE
   ========================================================= */

function downloadByDate(
    dateString
) {

    const message =
        document.getElementById(
            "downloadMessage"
        );


    message.textContent =
        "Preparing your files...";


    const url =
        "/download-date?date=" +
        encodeURIComponent(
            dateString
        ) +
        "&password=" +
        encodeURIComponent(
            accessPassword
        );


    /*
     * Navigate to the ZIP endpoint.
     *
     * The server creates the ZIP and
     * sends it as a download.
     */

    window.location.href =
        url;


    setTimeout(
        function() {

            message.textContent =
                "Your download is being prepared.";

        },
        500
    );
}


/* =========================================================
   DELETE MODAL
   ========================================================= */

function openDeleteModal(
    fileName
) {

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


function closeDeleteModal() {

    document
        .getElementById(
            "deleteModal"
        )
        .style.display =
        "none";


    document
        .getElementById(
            "deletePassword"
        )
        .value = "";


    document
        .getElementById(
            "deleteMessage"
        )
        .textContent = "";


    fileToDelete = "";
}


/* =========================================================
   CONFIRM DELETE
   ========================================================= */

async function confirmDelete() {

    const password =
        document.getElementById(
            "deletePassword"
        ).value;


    const message =
        document.getElementById(
            "deleteMessage"
        );


    if (!password) {

        message.textContent =
            "Enter the deletion password.";

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

                    body: JSON.stringify({

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

            message.style.color =
                "#36e38b";

            message.textContent =
                "🟢 File deleted successfully.";


            fileToDelete = "";


            await loadFiles();


            setTimeout(
                function() {

                    closeDeleteModal();

                },
                700
            );


        } else {

            message.style.color =
                "#ff5966";

            message.textContent =
                "🔴 " +
                (
                    result.message ||
                    "Delete failed."
                );

        }


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );

        message.style.color =
            "#ff5966";

        message.textContent =
            "🔴 Connection error.";

    }
}


/* =========================================================
   ENTER KEY FOR DELETE PASSWORD
   ========================================================= */

document
    .getElementById("deletePassword")
    .addEventListener(
        "keydown",
        function(event) {

            if (event.key === "Enter") {

                confirmDelete();

            }

            if (event.key === "Escape") {

                closeDeleteModal();

            }

        }
    );


/* =========================================================
   CLOSE MODALS WITH ESCAPE
   ========================================================= */

document.addEventListener(
    "keydown",
    function(event) {

        if (event.key !== "Escape") {
            return;
        }


        const downloadModal =
            document.getElementById(
                "downloadModal"
            );


        const deleteModal =
            document.getElementById(
                "deleteModal"
            );


        if (
            downloadModal.style.display ===
            "flex"
        ) {

            closeDownloadModal();

        }


        if (
            deleteModal.style.display ===
            "flex"
        ) {

            closeDeleteModal();

        }

    }
);
