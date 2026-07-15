/* common.js - shared helpers used across all Vidya pages */

const Vidya = {
    STORAGE_KEY: "vidya_state",

    getState() {
        try {
            return JSON.parse(sessionStorage.getItem(this.STORAGE_KEY)) || {};
        } catch (e) {
            return {};
        }
    },

    setState(partial) {
        const current = this.getState();
        const merged = Object.assign(current, partial);
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
        return merged;
    },

    clearState() {
        sessionStorage.removeItem(this.STORAGE_KEY);
    },

    goHome() {
        this.clearState();
        window.location.href = "/";
    },

    async apiGet(url) {
        const res = await fetch(url);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
        }
        return res.json();
    },

    async apiPost(url, data) {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Request failed (${res.status})`);
        }
        return res.json();
    },

    showError(container, message) {
        const div = document.createElement("div");
        div.className = "error-banner";
        div.textContent = message;
        container.prepend(div);
    },
};
