"use strict";

const TARGET_PHRASE = "I love Computer Science";
const challengeInput = document.getElementById("challengeInput");
const timerDisplay = document.getElementById("timer");
const inputStatus = document.getElementById("inputStatus");
const progressBar = document.getElementById("progressBar");
const feedback = document.getElementById("feedback");
const nameModal = document.getElementById("nameModal");
const playerName = document.getElementById("playerName");
const resultTime = document.getElementById("resultTime");
const modalError = document.getElementById("modalError");
const submitButton = document.getElementById("submitScore");
const scoreList = document.getElementById("scoreList");
const playerCount = document.getElementById("playerCount");
const celebration = document.getElementById("celebration");
const recordModal = document.getElementById("recordModal");

let startedAt = null;
let finishedTime = null;
let timerInterval = null;
let latestPlayerName = null;
let isSubmitting = false;

function formatTime(seconds) {
    return `${seconds.toFixed(3)}s`;
}

function startTimer() {
    if (startedAt !== null || finishedTime !== null) return;
    startedAt = performance.now();
    timerInterval = window.setInterval(() => {
        const elapsed = (performance.now() - startedAt) / 1000;
        timerDisplay.textContent = formatTime(elapsed);
    }, 30);
    inputStatus.textContent = "TIMING";
    inputStatus.style.color = "#75e5dc";
    feedback.textContent = "You're on the clock. Keep going!";
}

function stopTimer() {
    if (timerInterval !== null) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    finishedTime = (performance.now() - startedAt) / 1000;
    timerDisplay.textContent = formatTime(finishedTime);
}

function handleTyping() {
    if (finishedTime !== null) return;

    const typed = challengeInput.value;
    progressBar.style.width = `${Math.min(typed.length / TARGET_PHRASE.length, 1) * 100}%`;

    if (typed === TARGET_PHRASE) {
        stopTimer();
        challengeInput.disabled = true;
        inputStatus.textContent = "COMPLETE";
        inputStatus.style.color = "#75e5dc";
        feedback.textContent = "Perfect! You typed the phrase exactly.";
        resultTime.textContent = formatTime(finishedTime);
        nameModal.classList.add("show");
        nameModal.setAttribute("aria-hidden", "false");
        window.setTimeout(() => playerName.focus(), 250);
    } else if (TARGET_PHRASE.startsWith(typed)) {
        feedback.textContent = typed.length ? "Looking good — keep going!" : "Capital letters and spaces matter. Good luck!";
        feedback.style.color = "#8588a8";
    } else {
        feedback.textContent = "Not quite! Check the phrase and try again.";
        feedback.style.color = "#ff91b5";
    }
}

challengeInput.addEventListener("focus", startTimer);
challengeInput.addEventListener("input", handleTyping);

async function loadScores() {
    try {
        const response = await fetch("/api/scores");
        if (!response.ok) throw new Error("Could not load scores");
        const data = await response.json();
        renderScores(data.scores, null);
    } catch (error) {
        scoreList.innerHTML = '<li class="empty-state">Leaderboard temporarily unavailable.</li>';
    }
}

function renderScores(scores, newestName) {
    scoreList.replaceChildren();
    if (!scores.length) {
        const empty = document.createElement("li");
        empty.className = "empty-state";
        empty.textContent = "No scores yet. Be the first to claim your place!";
        scoreList.appendChild(empty);
    } else {
        scores.forEach((score, index) => {
            const item = document.createElement("li");
            item.className = `score-row rank-${index + 1}${score.name === newestName ? " latest" : ""}`;
            item.style.animationDelay = `${index * 35}ms`;

            const left = document.createElement("div");
            left.className = "score-left";
            const rank = document.createElement("span");
            rank.className = "rank";
            rank.textContent = index === 0 ? "①" : index === 1 ? "②" : index === 2 ? "③" : String(index + 1);
            const name = document.createElement("span");
            name.className = "score-name";
            name.textContent = score.name;
            if (score.name === newestName) {
                const tag = document.createElement("span");
                tag.className = "you-tag";
                tag.textContent = "NEW";
                name.appendChild(tag);
            }
            left.append(rank, name);

            const time = document.createElement("span");
            time.className = "score-time";
            time.textContent = formatTime(Number(score.time));
            item.append(left, time);
            // Font sizes descend from 20px for first place to 11px for tenth.
            item.querySelector(".score-name").style.fontSize = `${20 - index}px`;
            scoreList.appendChild(item);
        });
    }
    playerCount.textContent = `${scores.length} ${scores.length === 1 ? "SCORE" : "SCORES"} ON DISPLAY`;
}

submitButton.addEventListener("click", submitScore);
playerName.addEventListener("keydown", event => {
    if (event.key === "Enter") submitScore();
});

async function submitScore() {
    if (isSubmitting) return;
    const name = playerName.value.trim();
    if (!name) {
        modalError.textContent = "Please enter your name first.";
        playerName.focus();
        return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = "SAVING YOUR SCORE...";

    try {
        const response = await fetch("/api/scores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name,
                time: finishedTime,
                phrase: TARGET_PHRASE
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Your score could not be saved.");

        latestPlayerName = name;
        renderScores(data.scores, name);
        nameModal.classList.remove("show");
        nameModal.setAttribute("aria-hidden", "true");

        if (data.is_record) {
            document.getElementById("recordMessage").textContent =
                `Incredible, ${name}! You've taken the number one spot with ${formatTime(finishedTime)}.`;
            launchCelebration();
            window.setTimeout(() => {
                recordModal.classList.add("show");
                recordModal.setAttribute("aria-hidden", "false");
            }, 500);
        } else {
            feedback.textContent = `Nice one, ${name}! Your score has been added to the leaderboard.`;
            feedback.style.color = "#75e5dc";
        }
        window.setTimeout(() => window.location.reload(), 10000);
    } catch (error) {
        modalError.textContent = error.message;
    } finally {
        isSubmitting = false;
        submitButton.disabled = false;
        submitButton.innerHTML = 'ADD MY SCORE <span>→</span>';
    }
}

function launchCelebration() {
    celebration.replaceChildren();
    const colours = ["#ff78b7", "#9b83ff", "#65e5df", "#ffd36e", "#8ce6a7"];

    for (let i = 0; i < 100; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti";
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = colours[i % colours.length];
        piece.style.animationDuration = `${2.5 + Math.random() * 3}s`;
        piece.style.animationDelay = `${Math.random() * 1.4}s`;
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        celebration.appendChild(piece);
    }

    for (let i = 0; i < 17; i++) {
        const balloon = document.createElement("span");
        balloon.className = "balloon";
        balloon.style.left = `${Math.random() * 96}%`;
        balloon.style.background = colours[i % colours.length];
        balloon.style.animationDuration = `${6 + Math.random() * 5}s`;
        balloon.style.animationDelay = `${Math.random() * 2}s`;
        celebration.appendChild(balloon);
    }

    for (let i = 0; i < 24; i++) {
        const bubble = document.createElement("span");
        bubble.className = "bubble";
        const size = 12 + Math.random() * 35;
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDuration = `${4 + Math.random() * 5}s`;
        bubble.style.animationDelay = `${Math.random() * 2}s`;
        celebration.appendChild(bubble);
    }

    window.setTimeout(() => celebration.replaceChildren(), 12000);
}

document.getElementById("closeRecord").addEventListener("click", () => {
    recordModal.classList.remove("show");
    recordModal.setAttribute("aria-hidden", "true");
});

loadScores();
