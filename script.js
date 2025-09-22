const BOARD_SIZE = 8;
const EMPTY = 0;
const BLACK = 1;
const WHITE = -1;

const HUMAN_PLAYER = BLACK;
const COMPUTER_PLAYER = WHITE;
const COMPUTER_MOVE_DELAY_MS = 600;

let board = [];
let gameOver = false;
let currentPlayer = BLACK;
let validMoves = [];
let lastMove = null;
let moveNumber = 0;

const boardElement = document.getElementById('board');
const messageElement = document.getElementById('message');
const currentPlayerElement = document.getElementById('current-player');
const blackCountElement = document.getElementById('black-count');
const whiteCountElement = document.getElementById('white-count');
const restartButton = document.getElementById('restart-button');
const moveLogElement = document.getElementById('move-log');

const squareElements = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

createBoardSquares();
restartButton.addEventListener('click', resetGame);
resetGame();

function createBoardSquares() {
    boardElement.innerHTML = '';

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const square = document.createElement('button');
            square.type = 'button';
            square.className = 'square';
            square.dataset.row = String(row);
            square.dataset.col = String(col);
            square.setAttribute('aria-label', `${toCoordinateNotation(row, col)} のマス`);
            square.addEventListener('click', handleSquareClick);
            boardElement.appendChild(square);
            squareElements[row][col] = square;
        }
    }
}

function resetGame() {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
    const center = BOARD_SIZE / 2;
    board[center - 1][center - 1] = WHITE;
    board[center][center] = WHITE;
    board[center - 1][center] = BLACK;
    board[center][center - 1] = BLACK;

    currentPlayer = BLACK;
    gameOver = false;
    lastMove = null;
    validMoves = getValidMoves(currentPlayer);
    moveNumber = 0;
    clearMoveLog();
    logStatus('ゲーム開始: 黒の番です。');

    updateBoardUI();
    setMessage(`${playerRoleName(HUMAN_PLAYER)}からスタートします。ハイライトされたマスに駒を置いてください。`);
}

function handleSquareClick(event) {
    if (gameOver || currentPlayer !== HUMAN_PLAYER) {
        return;
    }

    const row = Number(event.currentTarget.dataset.row);
    const col = Number(event.currentTarget.dataset.col);
    if (!applyMove(row, col, HUMAN_PLAYER)) {
        if (validMoves.length > 0) {
            setMessage('そこには置けません。ハイライトされたマスを選んでください。');
        }
        return;
    }

    if (!gameOver && currentPlayer === COMPUTER_PLAYER) {
        setTimeout(handleComputerTurn, COMPUTER_MOVE_DELAY_MS);
    }
}

function placeDisc(row, col, player, flippableTiles) {
    board[row][col] = player;
    flippableTiles.forEach(([r, c]) => {
        board[r][c] = player;
    });

    lastMove = {
        player,
        row,
        col,
        flipped: new Set(flippableTiles.map(([r, c]) => `${r}-${c}`)),
    };

    logMove(player, row, col, flippableTiles.length);
}

function finishGame() {
    gameOver = true;
    validMoves = [];
    updateBoardUI();
    const counts = countDiscs();

    if (counts.black > counts.white) {
        setMessage(`ゲーム終了: 黒 ${counts.black} - 白 ${counts.white}。勝者は黒です！`);
        logStatus(`ゲーム終了: 黒が${counts.black}枚、白が${counts.white}枚。勝者は黒。`);
    } else if (counts.white > counts.black) {
        setMessage(`ゲーム終了: 黒 ${counts.black} - 白 ${counts.white}。勝者は白です！`);
        logStatus(`ゲーム終了: 黒が${counts.black}枚、白が${counts.white}枚。勝者は白。`);
    } else {
        setMessage(`ゲーム終了: 黒 ${counts.black} - 白 ${counts.white}。引き分けです。`);
        logStatus(`ゲーム終了: 黒が${counts.black}枚、白が${counts.white}枚。結果は引き分け。`);
    }
}

function updateBoardUI() {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const square = squareElements[row][col];
            square.classList.remove('valid-move');
            square.classList.remove('last-move');
            square.innerHTML = '';

            const state = board[row][col];
            if (state !== EMPTY) {
                const disc = document.createElement('div');
                disc.className = `disc ${state === BLACK ? 'black' : 'white'}`;

                if (lastMove && ((lastMove.row === row && lastMove.col === col) || lastMove.flipped.has(`${row}-${col}`))) {
                    disc.classList.add('flip');
                    setTimeout(() => disc.classList.remove('flip'), 350);
                }

                square.appendChild(disc);
            }
        }
    }

    highlightValidMoves();
    markLastMove();
    updateStatusPanel();
}

function highlightValidMoves() {
    if (gameOver) {
        return;
    }

    validMoves.forEach(({ row, col }) => {
        squareElements[row][col].classList.add('valid-move');
    });
}

function updateStatusPanel() {
    const counts = countDiscs();
    blackCountElement.textContent = String(counts.black);
    whiteCountElement.textContent = String(counts.white);

    if (!gameOver) {
        currentPlayerElement.textContent = playerRoleName(currentPlayer);
        currentPlayerElement.className = `player-label ${currentPlayer === BLACK ? 'player-black' : 'player-white'}`;
    }
}

function countDiscs() {
    let black = 0;
    let white = 0;

    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            const cell = board[row][col];
            if (cell === BLACK) {
                black += 1;
            } else if (cell === WHITE) {
                white += 1;
            }
        }
    }

    return { black, white };
}

function getValidMoves(player) {
    const moves = [];
    for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let col = 0; col < BOARD_SIZE; col += 1) {
            if (board[row][col] !== EMPTY) {
                continue;
            }

            const flippable = getFlippableTiles(row, col, player);
            if (flippable.length > 0) {
                moves.push({ row, col });
            }
        }
    }
    return moves;
}

function getFlippableTiles(row, col, player) {
    if (board[row][col] !== EMPTY) {
        return [];
    }

    const tiles = [];
    const directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1],
    ];

    directions.forEach(([rowStep, colStep]) => {
        const captured = collectInDirection(row, col, rowStep, colStep, player);
        tiles.push(...captured);
    });

    return tiles;
}

function collectInDirection(startRow, startCol, rowStep, colStep, player) {
    const captured = [];
    let row = startRow + rowStep;
    let col = startCol + colStep;
    const opponent = opposite(player);

    while (inBounds(row, col) && board[row][col] === opponent) {
        captured.push([row, col]);
        row += rowStep;
        col += colStep;
    }

    if (!inBounds(row, col) || board[row][col] !== player) {
        return [];
    }

    return captured;
}

function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function opposite(player) {
    return player === BLACK ? WHITE : BLACK;
}

function playerName(player) {
    return player === BLACK ? '黒' : '白';
}

function playerRoleName(player) {
    return player === HUMAN_PLAYER ? '黒（あなた）' : '白（コンピュータ）';
}

function toCoordinateNotation(row, col) {
    const columnLetter = String.fromCharCode('A'.charCodeAt(0) + col);
    return `${columnLetter}${row + 1}`;
}

function setMessage(text) {
    messageElement.textContent = text;
}

function markLastMove() {
    if (!lastMove) {
        return;
    }
    const { row, col } = lastMove;
    squareElements[row][col].classList.add('last-move');
}

function logMove(player, row, col, flippedCount) {
    moveNumber += 1;
    const item = document.createElement('li');
    const notation = toCoordinateNotation(row, col);
    const flippedText = flippedCount > 0 ? `挟んだ枚数 ${flippedCount}` : '挟んだ枚数 0';
    item.innerHTML = `<span class="move-number">#${moveNumber}</span> ${playerName(player)}が${notation}に配置 (${flippedText})`;
    appendLogItem(item);
}

function logStatus(text) {
    const item = document.createElement('li');
    item.textContent = text;
    appendLogItem(item);
}

function appendLogItem(item) {
    moveLogElement.appendChild(item);
    moveLogElement.scrollTop = moveLogElement.scrollHeight;
}

function clearMoveLog() {
    moveLogElement.innerHTML = '';
}

function applyMove(row, col, player) {
    const flippable = getFlippableTiles(row, col, player);
    if (flippable.length === 0) {
        return false;
    }

    placeDisc(row, col, player, flippable);

    const nextPlayer = opposite(player);
    const nextPlayerMoves = getValidMoves(nextPlayer);

    if (nextPlayerMoves.length === 0) {
        const playerMoves = getValidMoves(player);
        if (playerMoves.length === 0) {
            finishGame();
            return true;
        }

        currentPlayer = player;
        validMoves = playerMoves;
        setMessage(`${playerRoleName(nextPlayer)}は打てる場所がないためパス。${playerRoleName(player)}の番が続きます。`);
        logStatus(`${playerRoleName(nextPlayer)}は打てる場所がないためパス。${playerRoleName(player)}が続けて打ちます。`);
        updateBoardUI();
        return true;
    }

    currentPlayer = nextPlayer;
    validMoves = nextPlayerMoves;
    setMessage(`${playerRoleName(player)}が${toCoordinateNotation(row, col)}に置きました。${playerRoleName(currentPlayer)}の番です。`);
    updateBoardUI();
    return true;
}

function handleComputerTurn() {
    if (gameOver || currentPlayer !== COMPUTER_PLAYER) {
        return;
    }

    if (validMoves.length === 0) {
        const humanMoves = getValidMoves(HUMAN_PLAYER);
        if (humanMoves.length === 0) {
            finishGame();
            return;
        }

        currentPlayer = HUMAN_PLAYER;
        validMoves = humanMoves;
        setMessage(`${playerRoleName(COMPUTER_PLAYER)}は打てる場所がないためパス。${playerRoleName(HUMAN_PLAYER)}の番です。`);
        logStatus(`${playerRoleName(COMPUTER_PLAYER)}は打てる場所がないためパス。${playerRoleName(HUMAN_PLAYER)}が打ちます。`);
        updateBoardUI();
        return;
    }

    const { row, col } = chooseComputerMove(validMoves);
    applyMove(row, col, COMPUTER_PLAYER);

    if (!gameOver && currentPlayer === COMPUTER_PLAYER) {
        setTimeout(handleComputerTurn, COMPUTER_MOVE_DELAY_MS);
    }
}

function chooseComputerMove(moves) {
    const cornerMoves = moves.filter(({ row, col }) => isCorner(row, col));
    if (cornerMoves.length > 0) {
        return randomChoice(cornerMoves);
    }

    const edgeMoves = moves.filter(({ row, col }) => isEdge(row, col));
    if (edgeMoves.length > 0) {
        return randomChoice(edgeMoves);
    }

    return randomChoice(moves);
}

function isCorner(row, col) {
    const lastIndex = BOARD_SIZE - 1;
    return (row === 0 || row === lastIndex) && (col === 0 || col === lastIndex);
}

function isEdge(row, col) {
    const lastIndex = BOARD_SIZE - 1;
    return row === 0 || row === lastIndex || col === 0 || col === lastIndex;
}

function randomChoice(options) {
    const index = Math.floor(Math.random() * options.length);
    return options[index];
}
