/* topic.js - Topic_Selection page */
(function () {
    const state = Vidya.getState();
    let topicData = null;
    const selectedSections = new Set();

    function render() {
        document.getElementById("chapter-title").textContent =
            `${topicData.chapterNum}. ${topicData.chapter}`;

        const listEl = document.getElementById("section-list");
        if (!topicData.sections.length) {
            listEl.innerHTML = '<div class="empty-state">No sections found for this chapter.</div>';
            return;
        }

        listEl.innerHTML = "";
        topicData.sections.forEach((sec, idx) => {
            const row = document.createElement("div");
            row.className = "section-row";
            row.innerHTML = `
                <div class="section-index">${idx + 1}</div>
                <div class="section-name">${sec.name} <span style="color:#77879a;font-size:.8em;">(${sec.count} Qs)</span></div>
                <div class="section-check"><input type="checkbox" data-section="${sec.name}"></div>
            `;
            listEl.appendChild(row);
        });

        listEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
            cb.addEventListener("change", (e) => {
                const name = e.target.dataset.section;
                if (e.target.checked) selectedSections.add(name);
                else selectedSections.delete(name);
                updateOk();
            });
        });
    }

    function updateOk() {
        document.getElementById("btn-ok").disabled = selectedSections.size === 0;
    }

    async function init() {
        if (!state.masterId) {
            window.location.href = "/";
            return;
        }

        document.getElementById("btn-home").addEventListener("click", () => Vidya.goHome());
        document.getElementById("difficulty").addEventListener("input", (e) => {
            document.getElementById("difficulty-max").textContent = e.target.value;
        });

        try {
            topicData = await Vidya.apiGet(`/api/topics?id=${state.masterId}`);
        } catch (err) {
            Vidya.showError(document.getElementById("body"), "Could not load topics: " + err.message);
            document.getElementById("section-list").innerHTML = "";
            return;
        }

        render();

        document.getElementById("btn-ok").addEventListener("click", async () => {
            const maxDifficulty = Number(document.getElementById("difficulty").value);
            const btn = document.getElementById("btn-ok");
            btn.disabled = true;
            btn.textContent = "Loading...";
            try {
                const quiz = await Vidya.apiPost("/api/quiz/start", {
                    masterId: state.masterId,
                    sections: Array.from(selectedSections),
                    maxDifficulty,
                });
                if (!quiz.questions || quiz.questions.length === 0) {
                    Vidya.showError(document.getElementById("body"), "No questions available for this selection.");
                    btn.disabled = false;
                    btn.textContent = "OK";
                    return;
                }
                Vidya.setState({
                    table: quiz.table,
                    chapterId: quiz.chapterId,
                    chapter: quiz.chapter,
                    chapterNum: quiz.chapterNum,
                    questions: quiz.questions,
                    answers: {},
                    currentIndex: 0,
                });
                window.location.href = "/question.html";
            } catch (err) {
                Vidya.showError(document.getElementById("body"), "Could not start quiz: " + err.message);
                btn.disabled = false;
                btn.textContent = "OK";
            }
        });
    }

    document.addEventListener("DOMContentLoaded", init);
})();
