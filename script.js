const COLORS = [
    // Используем RGB, так как cell.style.backgroundColor возвращает именно этот формат
    {code: 'R', name: 'Красный', hex: '#e74c3c', rgb: 'rgb(231, 76, 60)'},
    {code: 'G', name: 'Зеленый', hex: '#27ae60', rgb: 'rgb(39, 174, 96)'},
    {code: 'B', name: 'Синий', hex: '#3498db', rgb: 'rgb(52, 152, 219)'},
    {code: 'Y', name: 'Желтый', hex: '#f1c40f', rgb: 'rgb(241, 196, 15)'}
];

let game = {
    secretCode: [],
    currentAttempt: 0,
    attempts: [],
    gameOver: false,
    isRowColored: false
};

// --- ОТРИСОВКА ---

function createGameBoard() {
    const board = document.getElementById('game-board');
    board.innerHTML = '';
    for (let i = 0; i < 6; i++) {
        const row = document.createElement('div');
        row.className = 'row';
        row.dataset.attempt = i;
        
        for (let j = 0; j < 4; j++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.pos = j;
            row.appendChild(cell);
        }

        const hints = document.createElement('div');
        hints.className = 'hints';
        for (let k = 0; k < 4; k++) {
            const hint = document.createElement('div');
            hint.className = 'hint';
            hints.appendChild(hint);
        }
        row.appendChild(hints);
        
        board.appendChild(row);
    }
}

function activateRow(rowElement) {
    document.querySelectorAll('.row').forEach(row => {
        row.dataset.active = "false";
        row.dataset.selecting = "false";
    });
    rowElement.dataset.active = "true";
    rowElement.dataset.selecting = "true";
    game.currentAttempt = parseInt(rowElement.dataset.attempt);
    game.isRowColored = false;
}

function lockRow(index) {
    const row = document.querySelector(`.row[data-attempt="${index}"]`);
    if (row) {
        row.dataset.locked = "true";
        row.dataset.selecting = "false";
        row.dataset.active = "false";
    }
}

function renderAnswer() {
    const answerRow = document.getElementById('answer-row');
    answerRow.classList.add('visible');
    game.secretCode.forEach((colorCode, i) => {
        const cell = document.getElementById(`answer-${i}`);
        const color = COLORS.find(c => c.code === colorCode);
        cell.style.backgroundColor = color.rgb; // Используем RGB
    });
}

function showMessage(text, isError = false) {
    const msg = document.getElementById('message');
    msg.textContent = text;
    msg.style.color = isError ? '#e74c3c' : '#27ae60';
}

// --- ЛОГИКА ОЦЕНКИ ---

function evaluateGuess(guess, secret) {
    const secretCopy = [...secret];
    const guessCopy = [...guess];
    let blacks = 0;
    let whites = 0;
    for (let i = 0; i < 4; i++) {
        if (guessCopy[i] === secretCopy[i]) { blacks++; guessCopy[i] = null; secretCopy[i] = null; }
    }
    for (let i = 0; i < 4; i++) {
        if (guessCopy[i] && secretCopy.includes(guessCopy[i])) { whites++; secretCopy[secretCopy.indexOf(guessCopy[i])] = null; }
    }
    return { blacks, whites };
}

// --- УПРАВЛЕНИЕ ХОДАМИ ---

function submitGuess() {
    if (game.gameOver || !game.isRowColored) return;

    const currentRow = document.querySelector('.row[data-active="true"]');
    const cells = currentRow.querySelectorAll('.cell');
    
    const guess = [];
    const colorsUsed = new Set();
    let isFull = true;
    let isUnique = true;

    cells.forEach(cell => {
        if (cell.style.backgroundColor) {
            const colorObj = COLORS.find(c => c.rgb === cell.style.backgroundColor);
            if (colorObj) {
                guess.push(colorObj.code);
                if (colorsUsed.has(colorObj.code)) isUnique = false;
                colorsUsed.add(colorObj.code);
            }
        } else {
            isFull = false;
        }
    });

    if (!isFull || !isUnique) return;

    const { blacks, whites } = evaluateGuess(guess, game.secretCode);
    game.attempts.push({ guess, blacks, whites });

    const hints = currentRow.querySelector('.hints').children;
    for (let i = 0; i < blacks; i++) hints[i].classList.add('black');
    for (let i = blacks; i < blacks + whites; i++) hints[i].classList.add('white');

    lockRow(game.currentAttempt);

    if (blacks === 4) {
        game.gameOver = true;
        renderAnswer();
        showMessage('Победа! Вы угадали код!');
    } else if (game.currentAttempt >= 5) {
        game.gameOver = true;
        renderAnswer();
        showMessage('Поражение. Попытки закончились.', true);
    } else {
        const nextRow = document.querySelector(`.row[data-attempt="${game.currentAttempt + 1}"]`);
        if (nextRow) {
            activateRow(nextRow);
            showMessage('Кликните по ячейкам, чтобы задать цвета.');
        }
    }
}

// --- ОБРАБОТЧИК КЛИКА (ИСПРАВЛЕННЫЙ ЦИКЛ) ---

function handleRowClick(event) {
    if (game.gameOver) return;
    if (!event.target.classList.contains('cell')) return;

    const cell = event.target;
    const row = cell.closest('.row');

    if (!row || row.dataset.locked === "true") return;

    if (row.dataset.active !== "true") {
        activateRow(row);
        return;
    }

    if (!cell.style.backgroundColor) {
        const color = COLORS[0];
        cell.style.backgroundColor = color.rgb;
        cell.classList.add('filled');
    } else {
        // Теперь сравнение работает, так как и в ячейке, и в массиве — RGB
        const currentColorRGB = cell.style.backgroundColor;
        const currentIndex = COLORS.findIndex(c => c.rgb === currentColorRGB);
        
        const nextIndex = (currentIndex + 1) % COLORS.length;
        const nextColor = COLORS[nextIndex];
        cell.style.backgroundColor = nextColor.rgb;
    }

    const filledCount = row.querySelectorAll('.cell.filled').length;
    game.isRowColored = (filledCount === 4);
    
    if (game.isRowColored) {
        showMessage('Ряд заполнен. Нажмите Enter для оценки.');
    } else {
        showMessage('Выбирайте цвета.');
    }
}

// --- ОБРАБОТЧИКИ ---

document.addEventListener('DOMContentLoaded', () => {
    createGameBoard();
    startNewGame();

    document.getElementById('game-board').addEventListener('click', handleRowClick);

    document.addEventListener('keydown', (e) => {
        if (game.gameOver) return;
        if (e.key === 'Enter') submitGuess();
    });

    document.getElementById('new-game-btn').addEventListener('click', startNewGame);
});

function startNewGame() {
    game.secretCode = [];
    game.currentAttempt = 0;
    game.attempts = [];
    game.gameOver = false;
    game.isRowColored = false;

    for (let i = 0; i < 4; i++) {
        game.secretCode.push(COLORS[Math.floor(Math.random() * COLORS.length)].code);
    }

    createGameBoard();
    document.getElementById('answer-row').classList.remove('visible');
    showMessage('Кликните по любой строке, чтобы начать.');
}