/* results.js - Results summary page (per-section score) */
(function () {
    const state = Vidya.getState();

    function computeSectionSummaries() {
        const bySection = {};
        state.questions.forEach((q) => {
            if (!bySection[q.section]) bySection[q.section] = [];
            bySection[q.section].push(q);
        });

        const sectionNames = Object.keys(bySection);
        return sectionNames.map((name, idx) => {
            const qs = bySection[name];
            const answered = qs.filter((q) => state.answers[q.id]);
            const correctCount = answered.filter((q) => state.answers[q.id].isCorrect).length;
            const pct = qs.length ? Math.round((correctCount / qs.length) * 100) : 0;
            return { index: idx + 1, name, pct, questionCount: qs.length };
        });
    }

    function render() {
        document.getElementById("results-title").textContent =
            `Results, ${state.chapterId}. ${state.chapter}`;

        const summaries = computeSectionSummaries();
        const listEl = document.getElementById("result-list");
        if (!summaries.length) {
            listEl.innerHTML = '<div class="empty-state">No results to show.</div>';
            return;
        }

        listEl.innerHTML = "";
        summaries.forEach((s) => {
            const row = document.createElement("div");
            row.className = "result-row";
            const faded = s.pct === 100 ? "faded" : "";
            row.innerHTML = `
                <div class="result-tag">${state.chapterId}.${s.index}</div>
                <div class="result-name">${s.name}</div>
                <div class="result-score">${s.pct}%</div>
                <div class="result-review-btn ${faded}" data-section="${s.name}">Review</div>
            `;
            listEl.appendChild(row);
        });

        listEl.querySelectorAll(".result-review-btn:not(.faded)").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const section = e.currentTarget.dataset.section;
                Vidya.setState({ reviewSection: section });
                window.location.href = "/section_results.html";
            });
        });
    }

    function init() {
        if (!state.questions || !state.answers) {
            window.location.href = "/";
            return;
        }
        document.getElementById("btn-home").addEventListener("click", () => Vidya.goHome());
        document.getElementById("btn-section").addEventListener("click", () => {
            window.location.href = "/topic_selection.html";
        });
        render();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
