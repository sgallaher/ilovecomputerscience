"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const leftNameInput = document.getElementById("leftPlayerName");
const rightNameInput = document.getElementById("rightPlayerName");
const startButton = document.getElementById("startPong");
const matchStatus = document.getElementById("matchStatus");

const leftBat = { x: 10, y: 200, width: 10, height: 50, speed: 15, up: false, down: false, score: 0 };
const rightBat = { x: 780, y: 200, width: 10, height: 50, speed: 15, up: false, down: false, score: 0 };
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 7,
    dx: 0,
    dy: 0
};

let game = null;
let matchActive = false;
let resultSubmitted = false;

function resetBall(direction = Math.random() < 0.5 ? -1 : 1) {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 7;
    const angle = (Math.random() * 60 - 30) * Math.PI / 180;
    ball.dx = direction * ball.speed * Math.cos(angle);
    ball.dy = ball.speed * Math.sin(angle);
}

function moveBat(bat) {
    if (bat.up) bat.y = Math.max(0, bat.y - bat.speed);
    if (bat.down) bat.y = Math.min(canvas.height - bat.height, bat.y + bat.speed);
}

function bounceOffBat(bat, direction) {
    let hitPosition = (ball.y - (bat.y + bat.height / 2)) / (bat.height / 2);
    hitPosition = Math.max(-1, Math.min(1, hitPosition));
    let angle = hitPosition * Math.PI / 3;
    if (Math.abs(angle) < Math.PI / 12) {
        angle = angle < 0 ? -Math.PI / 12 : Math.PI / 12;
    }
    ball.dx = direction * ball.speed * Math.cos(angle);
    ball.dy = ball.speed * Math.sin(angle);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#171831";
    ctx.fillRect(leftBat.x, leftBat.y, leftBat.width, leftBat.height);
    ctx.fillRect(rightBat.x, rightBat.y, rightBat.width, rightBat.height);

    ctx.fillStyle = "#ff72b6";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = "#8588a8";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#171831";
    ctx.fillText(String(leftBat.score), canvas.width / 2 - 100, canvas.height - 35);
    ctx.fillText(String(rightBat.score), canvas.width / 2 + 100, canvas.height - 35);
}

async function submitResult() {
    if (resultSubmitted) return;
    resultSubmitted = true;
    const leftName = leftNameInput.value.trim();
    const rightName = rightNameInput.value.trim();

    try {
        const response = await fetch("/api/pong-results", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                left_name: leftName,
                left_score: leftBat.score,
                right_name: rightName,
                right_score: rightBat.score
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The match result could not be saved.");
        matchStatus.textContent = "Result saved: " +
            `${leftName} (${leftBat.score}) vs ${rightName} (${rightBat.score})`;
    } catch (error) {
        matchStatus.textContent = error.message;
    }
}

function finishMatch() {
    matchActive = false;
    clearInterval(game);
    draw();
    const leftName = leftNameInput.value.trim();
    const rightName = rightNameInput.value.trim();
    ctx.fillStyle = "#171831";
    ctx.font = "32px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
        leftBat.score === 5 ? `${leftName} wins!` : `${rightName} wins!`,
        canvas.width / 2,
        canvas.height / 2
    );
    submitResult();
}

function loop() {
    if (!matchActive) return;
    moveBat(leftBat);
    moveBat(rightBat);

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.dy = Math.abs(ball.dy);
    }
    if (ball.y + ball.radius >= canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.dy = -Math.abs(ball.dy);
    }

    if (ball.dx < 0 &&
        ball.x - ball.radius <= leftBat.x + leftBat.width &&
        ball.y + ball.radius >= leftBat.y &&
        ball.y - ball.radius <= leftBat.y + leftBat.height) {
        bounceOffBat(leftBat, 1);
        ball.x = leftBat.x + leftBat.width + ball.radius;
    }
    if (ball.dx > 0 &&
        ball.x + ball.radius >= rightBat.x &&
        ball.y + ball.radius >= rightBat.y &&
        ball.y - ball.radius <= rightBat.y + rightBat.height) {
        bounceOffBat(rightBat, -1);
        ball.x = rightBat.x - ball.radius;
    }

    if (ball.x <= 0) {
        rightBat.score += 1;
        resetBall(-1);
    }
    if (ball.x >= canvas.width) {
        leftBat.score += 1;
        resetBall(1);
    }

    ball.speed = Math.min(ball.speed + 0.02, 16);
    draw();

    if (leftBat.score >= 5 || rightBat.score >= 5) finishMatch();
}

document.addEventListener("keydown", event => {
    if (event.key.toLowerCase() === "q") leftBat.up = true;
    if (event.key.toLowerCase() === "a") leftBat.down = true;
    if (event.key.toLowerCase() === "p") rightBat.up = true;
    if (event.key.toLowerCase() === "l") rightBat.down = true;
});
document.addEventListener("keyup", event => {
    if (event.key.toLowerCase() === "q") leftBat.up = false;
    if (event.key.toLowerCase() === "a") leftBat.down = false;
    if (event.key.toLowerCase() === "p") rightBat.up = false;
    if (event.key.toLowerCase() === "l") rightBat.down = false;
});

startButton.addEventListener("click", () => {
    const leftName = leftNameInput.value.trim();
    const rightName = rightNameInput.value.trim();
    if (!leftName || !rightName) {
        matchStatus.textContent = "Please enter both player names.";
        (!leftName ? leftNameInput : rightNameInput).focus();
        return;
    }
    if (matchActive) return;

    leftBat.score = 0;
    rightBat.score = 0;
    leftBat.y = (canvas.height - leftBat.height) / 2;
    rightBat.y = (canvas.height - rightBat.height) / 2;
    resultSubmitted = false;
    matchActive = true;
    leftNameInput.disabled = true;
    rightNameInput.disabled = true;
    startButton.disabled = true;
    matchStatus.textContent = `${leftName} (left) vs ${rightName} (right)`;
    resetBall();
    draw();
    game = setInterval(loop, 1000 / 24);
});
