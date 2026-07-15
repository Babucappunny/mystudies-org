/* question.js - Question page (before/after answering), max 10 questions */
(function () {
    let state = Vidya.getState();
    let selectedLetter = null;

    function currentQuestion() {
        return state.questions[state.currentIndex];
    }

    function render() {
        const q = currentQuestion();
        const total = state.questions.length;
        document.getElementById("progress").textContent = `Question ${state.currentIndex + 1} of ${total}`;
        document.getElementById("question-text").textContent = q.question;

        const optionsEl = document.getElementById("options");
        optionsEl.innerHTML = "";
        const letters = ["A", "B", "C", "D"];
        letters.forEach((letter) => {
            const text = q.options[letter];
            if (text === null || text === undefined || text === "") return;
            const row = document.createElement("label");
            row.className = "option-row";
            row.innerHTML = `
                <span class="option-letter">${letter}</span>
                <input type="radio" name="option" value="${letter}">
                <span class="option-text">${text}</span>
            `;
            optionsEl.appendChild(row);
        });

        // restore previous selection if user navigated back somehow
        const existing = state.answers && state.answers[q.id];
        if (existing) {
            selectedLetter = existing.selected;
            markSelected(existing.selected);
            document.getElementById("btn-next").disabled = false;
        } else {
            selectedLetter = null;
            document.getElementById("btn-next").disabled = true;
        }

        optionsEl.querySelectorAll('input[type="radio"]').forEach((input) => {
            input.addEventListener("change", (e) => {
                selectedLetter = e.target.value;
                markSelected(selectedLetter);
                document.getElementById("btn-next").disabled = false;
            });
        });
    }

    function markSelected(letter) {
        document.querySelectorAll(".option-row").forEach((row) => {
            const input = row.querySelector("input");
            row.classList.toggle("selected", input.value === letter);
            if (input.value === letter) input.checked = true;
        });
    }

    async function handleNext() {
        const q = currentQuestion();
        const btn = document.getElementById("btn-next");

        // Already answered this question in a previous visit (e.g. user
        // navigated back) -- don't re-submit to the server, just advance.
        const existing = state.answers && state.answers[q.id];
        if (existing && existing.selected === selectedLetter) {
            advance();
            return;
        }

        btn.disabled = true;
        btn.textContent = "Checking...";
        try {
            // The correct answer is never sent to the browser until this
            // point -- the server looks it up and reports back, so the
            // answer key can't be read out of the quiz-start payload.
            const resp = await Vidya.apiPost("/api/answer", {
                table: state.table,
                questionId: q.id,
                selected: selectedLetter,
            });
            const answers = state.answers || {};
            answers[q.id] = { selected: selectedLetter, correct: resp.correct, isCorrect: resp.isCorrect };
            state = Vidya.setState({ answers });
        } catch (err) {
            Vidya.showError(document.getElementById("body"), "Could not record your answer: " + err.message + ". Please try again.");
            btn.disabled = false;
            btn.textContent = "Next";
            return;
        }
        btn.textContent = "Next";
        advance();
    }

    function advance() {
        if (state.currentIndex + 1 < state.questions.length) {
            state = Vidya.setState({ currentIndex: state.currentIndex + 1 });
            render();
        } else {
            window.location.href = "/results.html";
        }
    }

    function init() {
        if (!state.questions || state.questions.length === 0) {
            window.location.href = "/";
            return;
        }
        document.getElementById("btn-home").addEventListener("click", () => Vidya.goHome());
        document.getElementById("btn-section").addEventListener("click", () => {
            window.location.href = "/topic_selection.html";
        });
        document.getElementById("btn-next").addEventListener("click", handleNext);
        render();
    }

    document.addEventListener("DOMContentLoaded", init);
})();
