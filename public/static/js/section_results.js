/* section_results.js - Results, X.n <Section> detail page */
(function () {
    const state = Vidya.getState();

    function questionsInSection() {
        return state.questions
            .map((q, idx) => ({ q, orderNo: idx + 1 }))
            .filter((item) => item.q.section === state.reviewSection);
    }

    function sectionIndex() {
        const sectionNames = [...new Set(state.questions.map((q) => q.section))];
        return sectionNames.indexOf(state.reviewSection) + 1;
    }

    function render() {
        document.getElementById("section-title").textContent =
            `Results, ${state.chapterId}.${sectionIndex()} ${state.reviewSection}`;

        const items = questionsInSection();
        const body = document.getElementById("detail-body");
        body.innerHTML = "";

        items.forEach((item) => {
            // The correct answer only ever comes from the server's
            // response to /api/answer (stored per-question once the user
            // has answered) -- never from the original quiz payload.
            const answer = state.answers[item.q.id];
            const yourAnswer = answer ? answer.selected : "-";
            const correctAnswer = answer ? answer.correct : "-";
            const isCorrect = answer ? answer.isCorrect : false;
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${item.orderNo}</td>
                <td class="${isCorrect ? "" : "wrong-answer"}">${yourAnswer}</td>
                <td>${correctAnswer}</td>
                <td>
                    <span class="result-review-btn ${isCorrect ? "faded" : ""}" data-index="${item.orderNo - 1}">Review</span>
                </td>
            `;
            body.appendChild(tr);
        });

        body.querySelectorAll(".result-review-btn:not(.faded)").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const idx = Number(e.currentTarget.dataset.index);
                Vidya.setState({ reviewQuestionIndex: idx });
                window.location.href = "/question_review.html";
            });
        });
    }

    function init() {
        if (!state.questions || !state.reviewSection) {
            window.location.href = "/results.html";
            return;
        }
        document.getElementById("btn-home").addEventListener("click", () => Vidya.goHome());
        document.getElementById("btn-section").addEventListener("click", () => {
            window.location.href = "/topic_selection.html";
        });
        document.getElementById("btn-back").addEventListener("click", () => {
            window.location.href = "/results.html";
        });
        render();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
