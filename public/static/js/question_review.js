/* question_review.js - Review page for a single answered MCQ */
(function () {
    const state = Vidya.getState();

    function render() {
        const idx = state.reviewQuestionIndex;
        const q = state.questions[idx];
        const total = state.questions.length;
        const answer = state.answers[q.id];
        // The correct answer is only known once the server has confirmed
        // it via /api/answer; every question reachable from the review
        // flow has already been answered, so `answer` is always present.
        const correctLetter = answer ? answer.correct : null;

        document.getElementById("progress").textContent = `Question ${idx + 1} of ${total}`;
        document.getElementById("question-text").textContent = q.question;

        const optionsEl = document.getElementById("options");
        optionsEl.innerHTML = "";
        const letters = ["A", "B", "C", "D"];
        letters.forEach((letter) => {
            const text = q.options[letter];
            if (text === null || text === undefined || text === "") return;

            const isCorrectAnswer = letter === correctLetter;
            const isUserWrongPick = answer && answer.selected === letter && letter !== correctLetter;

            let cls = "option-row";
            let dot = '<span class="option-letter">' + letter + "</span>";
            if (isCorrectAnswer) {
                cls += " correct-highlight";
                dot = '<span class="option-letter">● ' + letter + "</span>";
            } else if (isUserWrongPick) {
                cls += " wrong-highlight";
                dot = '<span class="option-letter">● ' + letter + "</span>";
            } else {
                dot = '<span class="option-letter">○ ' + letter + "</span>";
            }

            const row = document.createElement("div");
            row.className = cls;
            row.innerHTML = `${dot}<span class="option-text">${text}</span>`;
            optionsEl.appendChild(row);
        });
    }

    function init() {
        if (!state.questions || state.reviewQuestionIndex === undefined) {
            window.location.href = "/results.html";
            return;
        }
        document.getElementById("btn-home").addEventListener("click", () => Vidya.goHome());
        document.getElementById("btn-section").addEventListener("click", () => {
            window.location.href = "/topic_selection.html";
        });
        document.getElementById("btn-back").addEventListener("click", () => {
            window.location.href = "/section_results.html";
        });
        render();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
