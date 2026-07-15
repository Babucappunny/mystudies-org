/* selector.js - Vidya_Subject_Selector (Selection Page) */
(function () {
    const FIELDS = [
        { key: "Syllabus", id: "sel-syllabus" },
        { key: "Grade", id: "sel-grade" },
        { key: "Language", id: "sel-language" },
        { key: "Subject", id: "sel-subject" },
        { key: "Book#", id: "sel-book" },
        { key: "Chapter#", id: "sel-chapter" },
        { key: "Type", id: "sel-type" },
    ];

    let masterRows = [];
    const selections = {};

    function labelFor(key, value) {
        if (key === "Chapter#") return value; // shown plain; chapter name added separately
        return value;
    }

    function rowsMatchingSoFar(uptoIndex) {
        return masterRows.filter((row) => {
            for (let i = 0; i < uptoIndex; i++) {
                const f = FIELDS[i];
                if (String(row[f.key]) !== String(selections[f.key])) return false;
            }
            return true;
        });
    }

    function populateDropdown(index) {
        const field = FIELDS[index];
        const select = document.getElementById(field.id);
        const candidates = rowsMatchingSoFar(index);
        const values = [...new Set(candidates.map((r) => r[field.key]))];

        select.innerHTML = '<option value="">-- Select --</option>';
        values.forEach((v) => {
            const opt = document.createElement("option");
            opt.value = v;
            opt.textContent = field.key === "Chapter#"
                ? `${v} - ${candidates.find((r) => String(r["Chapter#"]) === String(v))?.Chapter || ""}`
                : v;
            select.appendChild(opt);
        });
        select.disabled = values.length === 0;
    }

    function resetFrom(index) {
        for (let i = index; i < FIELDS.length; i++) {
            const field = FIELDS[i];
            delete selections[field.key];
            const select = document.getElementById(field.id);
            select.innerHTML = '<option value="">-- Select --</option>';
            select.disabled = true;
        }
    }

    function findMatchingRow() {
        return masterRows.find((row) =>
            FIELDS.every((f) => String(row[f.key]) === String(selections[f.key]))
        );
    }

    function updateOkButton() {
        const allSelected = FIELDS.every((f) => selections[f.key] !== undefined && selections[f.key] !== "");
        const match = allSelected ? findMatchingRow() : null;
        const btn = document.getElementById("btn-ok");
        btn.disabled = !match;
        btn.dataset.masterId = match ? match.Id : "";
    }

    function onChange(index) {
        return function (e) {
            const field = FIELDS[index];
            const value = e.target.value;
            resetFrom(index + 1);
            if (value === "") {
                delete selections[field.key];
            } else {
                selections[field.key] = value;
            }
            if (value !== "" && index + 1 < FIELDS.length) {
                populateDropdown(index + 1);
            }
            updateOkButton();
        };
    }

    async function init() {
        Vidya.clearState();
        try {
            masterRows = await Vidya.apiGet("/api/masterdata");
        } catch (err) {
            Vidya.showError(document.getElementById("body"), "Could not load selection data: " + err.message);
            return;
        }

        if (masterRows.length === 0) {
            Vidya.showError(document.getElementById("body"), "MasterData table is empty.");
            return;
        }

        populateDropdown(0);
        FIELDS.forEach((field, index) => {
            document.getElementById(field.id).addEventListener("change", onChange(index));
        });

        document.getElementById("btn-ok").addEventListener("click", () => {
            const masterId = document.getElementById("btn-ok").dataset.masterId;
            if (!masterId) return;
            const match = masterRows.find((r) => String(r.Id) === String(masterId));
            Vidya.setState({ masterId: Number(masterId), masterRow: match });
            window.location.href = "/topic_selection.html";
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
