document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. ANIMACIÓN DE LETRAS DEL TÍTULO
    // ==========================================
    const titleEl = document.querySelector('.game-title');
    if (titleEl) {
        const text = titleEl.textContent;
        titleEl.innerHTML = text.split('').map((char, index) => {
            if (char === ' ') return ' ';
            const delay = (index * 0.15).toFixed(2);
            return `<span style="animation-delay: ${delay}s;">${char}</span>`;
        }).join('');
    }

    // ==========================================
    // 1. GESTIÓN DE AUDIO Y EFECTOS SONOROS
    // ==========================================
    let soundOn = true;
    const sndDropDown = new Audio('images/drop_down_menu.mp3');
    const sndMovement = new Audio('images/movement.mp3');
    const sndStart = new Audio('images/start.mp3');
    const sndVictory = new Audio('images/victory.mp3');
    const sndWrong = new Audio('images/wrong.mp3');
    const sndHint = new Audio('images/hint.mp3');
    const sndVolver = new Audio('images/volver.mp3');

    function playSound(audioObj) {
        if (!soundOn) return;
        try {
            audioObj.currentTime = 0;
            audioObj.play().catch(e => console.log("Audio play prevented:", e));
        } catch (err) {
            console.log("Audio error:", err);
        }
    }

    // ==========================================
    // 2. REFERENCIAS A ELEMENTOS DEL DOM
    // ==========================================
    const homeScreen = document.getElementById('home-screen');
    const gameScreen = document.getElementById('game-screen');
    const startBtn = document.getElementById('start-btn');
    const backHomeBtn = document.getElementById('back-home-btn');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const soundToggle = document.getElementById('sound-toggle');
    const soundStatus = document.getElementById('sound-status');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const helpToggle = document.getElementById('help-toggle');

    const difficultyBtn = document.getElementById('difficulty-btn');
    const difficultyMenu = document.getElementById('difficulty-menu');
    const gametypeBtn = document.getElementById('gametype-btn');
    const gametypeMenu = document.getElementById('gametype-menu');

    const helpModal = document.getElementById('help-modal');
    const closeHelpModal = document.getElementById('close-help-modal');
    const closeHelpBtn = document.getElementById('close-help-btn');
    const victoryModal = document.getElementById('victory-modal');
    const restartBtn = document.getElementById('restart-btn');

    const puzzleBoard = document.getElementById('puzzle-board');
    const infoDiff = document.getElementById('info-diff');
    const gameSubHeader = document.getElementById('game-sub-header');
    const infoTimer = document.getElementById('info-timer');
    const hintBtn = document.getElementById('hint-btn');

    // ==========================================
    // 3. VARIABLES DE ESTADO
    // ==========================================
    let currentDifficulty = 'easy';
    let currentGameType = 'free';
    let timerInterval = null;
    let inactivityTimer = null;
    let secondsElapsed = 0;
    let currentImageURL = '';
    
    const gridSizes = { 'easy': 3, 'medium': 4, 'hard': 5 };
    let boardState = []; 
    let emptyIndex = 0;  
    let currentGridSize = 3;
    let isPlaying = false;

    // ==========================================
    // 4. CONTROL DE MENÚS Y AJUSTES
    // ==========================================
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound(sndDropDown);
        settingsMenu.classList.toggle('hidden');
        difficultyMenu.classList.add('hidden');
        gametypeMenu.classList.add('hidden');
    });

    difficultyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound(sndDropDown);
        difficultyMenu.classList.toggle('hidden');
        settingsMenu.classList.add('hidden');
        gametypeMenu.classList.add('hidden');
    });

    document.querySelectorAll('#difficulty-menu .sub-item').forEach(item => {
        item.addEventListener('click', (e) => {
            currentDifficulty = e.target.getAttribute('data-diff');
            difficultyBtn.textContent = e.target.textContent;
            difficultyMenu.classList.add('hidden');
        });
    });

    gametypeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound(sndDropDown);
        gametypeMenu.classList.toggle('hidden');
        settingsMenu.classList.add('hidden');
        difficultyMenu.classList.add('hidden');
    });

    document.querySelectorAll('#gametype-menu .sub-item').forEach(item => {
        item.addEventListener('click', (e) => {
            currentGameType = e.target.getAttribute('data-type');
            gametypeBtn.textContent = e.target.textContent;
            gametypeMenu.classList.add('hidden');
        });
    });

    // Cerrar despliegues al hacer clic fuera
    document.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
        difficultyMenu.classList.add('hidden');
        gametypeMenu.classList.add('hidden');
    });

    soundToggle.addEventListener('click', () => {
        soundOn = !soundOn;
        soundStatus.textContent = soundOn ? 'ON' : 'OFF';
    });

    fullscreenToggle.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });

    // Gestión de la ventana modal de ayuda
    helpToggle.addEventListener('click', () => {
        playSound(sndDropDown);
        helpModal.classList.remove('hidden');
    });

    closeHelpModal.addEventListener('click', () => {
        helpModal.classList.add('hidden');
    });

    closeHelpBtn.addEventListener('click', () => {
        helpModal.classList.add('hidden');
    });

    window.addEventListener('click', (e) => {
        if (e.target === helpModal) {
            helpModal.classList.add('hidden');
        }
    });

    // ==========================================
    // 5. CICLO DE PARTIDA (INICIO / SALIDA)
    // ==========================================
    startBtn.addEventListener('click', () => {
        playSound(sndStart);
        homeScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        initGame();
    });

    backHomeBtn.addEventListener('click', () => {
        playSound(sndVolver);
        gameScreen.classList.add('hidden');
        homeScreen.classList.remove('hidden');
        stopGameSession();
    });

    restartBtn.addEventListener('click', () => {
        victoryModal.classList.add('hidden');
        playSound(sndStart);
        initGame();
    });

    function stopGameSession() {
        isPlaying = false;
        clearInterval(timerInterval);
        clearTimeout(inactivityTimer);
        updateHintButtonState(false);
    }

    // ==========================================
    // 6. LÓGICA DEL JUEGO Y TABLERO
    // ==========================================
    function initGame() {
        isPlaying = true;
        secondsElapsed = 0;
        infoDiff.textContent = difficultyBtn.textContent !== 'Dificultad' ? difficultyBtn.textContent : 'Fácil (3x3)';

        currentGridSize = gridSizes[currentDifficulty];
        const totalPieces = currentGridSize * currentGridSize;

        const randomSeed = Math.floor(Math.random() * 10000);
        currentImageURL = `https://picsum.photos/seed/${randomSeed}/800/800`;
        gameScreen.style.backgroundImage = `url('${currentImageURL}')`;

        puzzleBoard.style.gridTemplateColumns = `repeat(${currentGridSize}, 1fr)`;
        puzzleBoard.style.gridTemplateRows = `repeat(${currentGridSize}, 1fr)`;

        boardState = Array.from({length: totalPieces}, (_, i) => i);
        emptyIndex = totalPieces - 1;

        shufflePuzzle(currentGridSize * 45);
        renderBoard();
        updateHintButtonState(true);
        resetInactivityTimer();

        clearInterval(timerInterval);
        if (currentGameType === 'chrono') {
            gameSubHeader.classList.remove('hidden');
            infoTimer.classList.remove('hidden');
            timerInterval = setInterval(() => {
                secondsElapsed++;
                let mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
                let secs = (secondsElapsed % 60).toString().padStart(2, '0');
                infoTimer.textContent = `⏱️ ${mins}:${secs}`;
            }, 1000);
        } else {
            gameSubHeader.classList.add('hidden');
            infoTimer.classList.add('hidden');
        }
    }

    function shufflePuzzle(moves) {
        for (let i = 0; i < moves; i++) {
            let neighbors = getValidNeighbors(emptyIndex, currentGridSize);
            let randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
            let temp = boardState[emptyIndex];
            boardState[emptyIndex] = boardState[randomNeighbor];
            boardState[randomNeighbor] = temp;
            emptyIndex = randomNeighbor;
        }
    }

    function getValidNeighbors(idx, size) {
        let row = Math.floor(idx / size);
        let col = idx % size;
        let neighbors = [];
        if (row > 0) neighbors.push((row - 1) * size + col);          
        if (row < size - 1) neighbors.push((row + 1) * size + col);    
        if (col > 0) neighbors.push(row * size + (col - 1));           
        if (col < size - 1) neighbors.push(row * size + (col + 1));    
        return neighbors;
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        if (!isPlaying) return;
        inactivityTimer = setTimeout(() => { showHint(); }, 15000);
    }

    function updateHintButtonState(active) {
        if (active) {
            hintBtn.classList.remove('bulb-off');
            hintBtn.classList.add('bulb-on');
        } else {
            hintBtn.classList.remove('bulb-on');
            hintBtn.classList.add('bulb-off');
        }
    }

    function findNextOptimalMove() {
        const target = Array.from({length: currentGridSize * currentGridSize}, (_, i) => i);
        if (boardState.every((val, idx) => val === target[idx])) return null;

        let queue = [{ state: [...boardState], empty: emptyIndex, firstMove: null }];
        let visited = new Set();
        visited.add(boardState.join(','));

        let head = 0;
        while(head < queue.length) {
            let current = queue[head++];
            if (current.state.every((val, idx) => val === target[idx])) return current.firstMove;

            let neighbors = getValidNeighbors(current.empty, currentGridSize);
            for (let neighbor of neighbors) {
                let nextState = [...current.state];
                nextState[current.empty] = nextState[neighbor];
                nextState[neighbor] = currentGridSize * currentGridSize - 1;

                let stateKey = nextState.join(',');
                if (!visited.has(stateKey)) {
                    visited.add(stateKey);
                    queue.push({
                        state: nextState,
                        empty: neighbor,
                        firstMove: current.firstMove === null ? neighbor : current.firstMove
                    });
                }
            }
        }
        return null;
    }

    function showHint() {
        if (!isPlaying) return;
        const bestMoveIndex = findNextOptimalMove();
        if (bestMoveIndex === null) return;

        const boardTiles = puzzleBoard.children;
        for (let i = 0; i < boardState.length; i++) {
            if (boardState[i] === boardState[bestMoveIndex]) {
                const tileElement = boardTiles[i];
                if (tileElement) {
                    const fromRow = Math.floor(i / currentGridSize);
                    const fromCol = i % currentGridSize;
                    const emptyRow = Math.floor(emptyIndex / currentGridSize);
                    const emptyCol = emptyIndex % currentGridSize;

                    let arrowClass = '';
                    if (emptyRow < fromRow) arrowClass = 'arrow-up';
                    else if (emptyRow > fromRow) arrowClass = 'arrow-down';
                    else if (emptyRow < fromCol) arrowClass = 'arrow-left';
                    else if (emptyRow > fromCol) arrowClass = 'arrow-right';

                    tileElement.classList.add('hint-active', arrowClass);
                    break;
                }
            }
        }
    }

    hintBtn.addEventListener('click', () => {
        if (!isPlaying) return;
        playSound(sndHint);
        clearHints();
        showHint();
        resetInactivityTimer();
    });

    function clearHints() {
        Array.from(puzzleBoard.children).forEach(tile => {
            tile.classList.remove('hint-active', 'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right');
        });
    }

    function renderBoard() {
        puzzleBoard.innerHTML = '';
        const totalPieces = currentGridSize * currentGridSize;

        for (let i = 0; i < totalPieces; i++) {
            const tile = document.createElement('div');
            tile.classList.add('puzzle-tile');
            
            const pieceOriginalIndex = boardState[i];

            if (pieceOriginalIndex === totalPieces - 1) {
                tile.classList.add('empty');
            } else {
                tile.style.backgroundImage = `url('${currentImageURL}')`;
                tile.style.backgroundSize = `${currentGridSize * 100}% ${currentGridSize * 100}%`;

                const origRow = Math.floor(pieceOriginalIndex / currentGridSize);
                const origCol = pieceOriginalIndex % currentGridSize;

                const posX = currentGridSize > 1 ? (origCol / (currentGridSize - 1)) * 100 : 0;
                const posY = currentGridSize > 1 ? (origRow / (currentGridSize - 1)) * 100 : 0;
                tile.style.backgroundPosition = `${posX}% ${posY}%`;

                tile.addEventListener('click', () => {
                    if (!isPlaying) return;
                    trySlide(i);
                });
            }
            puzzleBoard.appendChild(tile);
        }
    }

    function trySlide(clickedIndex) {
        let validNeighbors = getValidNeighbors(emptyIndex, currentGridSize);

        if (validNeighbors.includes(clickedIndex)) {
            clearHints();
            resetInactivityTimer();
            playSound(sndMovement);

            boardState[emptyIndex] = boardState[clickedIndex];
            boardState[clickedIndex] = currentGridSize * currentGridSize - 1;
            emptyIndex = clickedIndex;

            renderBoard();
            checkVictory();
        } else if (clickedIndex !== emptyIndex) {
            playSound(sndWrong);
        }
    }

    function checkVictory() {
        let isWon = boardState.every((val, idx) => val === idx);
        if (isWon) {
            stopGameSession();
            playSound(sndVictory);
            
            // Explosión grande de confeti al ganar el puzzle
            var count = 200;
            var defaults = { origin: { y: 0.7 } };

            function fire(particleRatio, opts) {
                confetti(Object.assign({}, defaults, opts, {
                    particleCount: Math.floor(count * particleRatio)
                }));
            }

            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });

            setTimeout(() => { victoryModal.classList.remove('hidden'); }, 300);
        }
    }
});