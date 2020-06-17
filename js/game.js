const Game = {
    title: 'Rainbow Island',
    author: 'Cristian Viñuales & Laura del Toro',
    license: null,
    version: '1.0.0',
    canvasDom: undefined,
    ctx: undefined,
    intervalId: undefined,
    FPS: 60,
    framesCounter: 0,
    maxFrames: 5000,
    score: 0,
    isPlaying: true,
    scoreBackgroundSource: "images/score.png",
    canvasSize: {
        w: undefined,
        h: undefined
    },
    scoreImg: {
        img: undefined,
        source: "images/score.png",
        h: 60,
        wLeft: 300,
        wRight: 350,
        y: undefined,
        xLeft: 80,
        xRight: undefined
    },
    keys: {
        SPACE: 32,
        LEFT: 37,
        RIGHT: 39,
        XKey: 88
    },
    cameraVelocity: 10,
    background: undefined,
    player: undefined,
    higherPlayerPosition: 300,
    map: undefined,
    mapCols: 20,
    mapRows: 44,
    mapTSize: undefined,
    actualRainbowCollissionY: undefined,
    enemies: [],
    enemiesSources: ["images/floor-enemie-1.png", "images/floor-enemie-2.png"],
    starterEnemieVel: [1, -1, 2, -2],
    enemiesCollisionRetarder: 0,
    chest: undefined,
    winMessage: undefined,
    winnerTimeOut: 300,
    basePosition: {
        y: undefined,
        x: undefined
    },
    initGame(id) {
        this.canvasDom = document.getElementById(id)
        this.ctx = this.canvasDom.getContext('2d')
        this.resetValues()
        this.startGame()
    },
    startGame() {
        this.background = new Background(this.ctx, this.canvasSize, "images/skybackground.jpeg")
        this.map = new Map(this.ctx, this.mapCols, this.mapRows, this.mapTSize, this.canvasSize, this.higherPlayerPosition, this.cameraVelocity, "images/21-tileset.png")
        this.player = new Player(this.ctx, this.canvasSize, this.basePosition.y, "images/running-bothsides.png", 16, this.keys, this.cameraVelocity)
        this.chest = new Chest(this.ctx, this.canvasSize, 200, 250, this.map)
        this.winMessage = new WinMessage(this.ctx, this.canvasSize, 70, 600, this.map)

        this.background.createBackground()
        this.map.createMapImage()
        this.player.createImgPlayer()
        this.player.createImgHeart()
        this.createGameInfoBoxes()
        this.chest.createChest()
        this.winMessage.createWinMessage()

        this.intervalId = setInterval(() => {
            this.clearGame()
            this.background.drawBackground()
            this.map.drawMap(this.player)
            this.chest.setChestY()
            this.chest.drawChest()
            this.player.drawPlayer(this.framesCounter, this.higherPlayerPosition)
            this.enemies.forEach(enemie => enemie.drawFloorEnemie(this.framesCounter))
            this.drawGameInfoBoxes()
            this.player.drawLives()
            this.drawScore()

            this.isPlaying ? this.createRandomEnemie() : null
            this.hasPlayerWon() ? this.manageWinner() : null;
            !this.player.isAlive() ? this.manageLoser() : null
            this.isPlayerCollidingEnemies() ? this.damagePlayer() : null
            this.player.isFalling = this.player.playerVelocity.y < 0 ? true : false

            this.managePlayerCollisionWithPlatforms(this.mapTSize)
            this.manageEnemiesCollisonWithPlatforms()
            this.managePlayerRainbowCollissions()
            this.manageEnemiesRainbowCollission()

            this.framesCounter = this.framesCounter >= this.maxFrames ? 0 : this.framesCounter + 1
        }, 1000 / this.FPS)
    },
    endGame() {
        clearInterval(this.intervalId)
    },
    clearGame() {
        this.ctx.clearRect(0, 0, this.canvasSize.w, this.canvasSize.h)
    },
    managePlayerCollisionWithPlatforms() {
        const collidingTile = this.getCollidingTile(this.player.playerPosition, this.player.playerSize)
        if (collidingTile) {
            if (this.player.isFalling) {
                this.player.basePosition.y = collidingTile
                this.player.setPlayerToStaticPosition()
            }
        } else {
            if (!this.player.isJumping && !this.isCollidingRainbows(this.player.playerPosition, this.player.playerSize)) {
                this.player.playerVelocity.y = -this.cameraVelocity
                this.player.playerPosition.y -= this.player.playerVelocity.y
            }
        }

    },
    manageEnemiesCollisonWithPlatforms() {
        this.enemies.forEach(enem => {
            const collidingTile = this.getCollidingTile(enem.enemiePosition, enem.enemieSize)
            if (collidingTile) {
                enem.enemieVelocity.y = 0
                enem.enemiePosition.y = collidingTile - enem.enemieSize.h
            } else {
                enem.enemieVelocity.y = -6
                enem.enemiePosition.y -= enem.enemieVelocity.y
            }
        })
    },
    getCollidingTile(characterPosition, characterSize) {
        let tileYAxis;
        this.map.layer.forEach((row, rowIndex) => {
            row.forEach((col, colIndex) => {
                if (
                    col &&
                    this.isCharacterWidthAfterTileXOrigin(colIndex, characterPosition.x, characterSize.w) &&
                    this.isCharacterHeightOverTileYOrigin(rowIndex, characterPosition.y, characterSize.h) &&
                    this.isCharacterXOriginBeforeTileWidth(colIndex, characterPosition.x) &&
                    this.isCharacterYOrigingOverTileYWidth(rowIndex, characterPosition.y, characterSize.h)
                ) {
                    tileYAxis = this.map.getTileYAxis(rowIndex)
                }
            })
        })
        return tileYAxis
    },
    manageEnemiesRainbowCollission() {
        this.enemies.forEach((enem, i) => {
            if (this.isCollidingRainbows(enem.enemiePosition, enem.enemieSize)) {
                this.enemies.splice(i, 1)
                this.score += 100
            }
        })

    },
    managePlayerRainbowCollissions() {
        if (this.isCollidingRainbows(this.player.playerPosition, this.player.playerSize)) {
            if (this.player.isFalling) {
                this.player.basePosition.y = this.actualRainbowCollissionY
                this.player.playerPosition.y = this.player.basePosition.y - this.player.playerSize.h
                this.player.setPlayerToStaticPosition()
            }
        }
    },
    isCollidingRainbows(characterPosition, characterSize) {
        return this.player.rainbowsConstructed.some(rainbow => {
            if (rainbow.actualRainbowDirection === "right") {
                if (
                    characterPosition.x + characterSize.w - 20 >= rainbow.rainbowPosition.facingRigth.x &&
                    characterPosition.y + characterSize.h >= rainbow.rainbowPosition.facingRigth.y + rainbow.rainbowToDraw.y - 5 &&
                    characterPosition.x <= rainbow.rainbowPosition.facingRigth.x + rainbow.rainbowSize.w &&
                    characterPosition.y < rainbow.rainbowPosition.facingRigth.y + rainbow.rainbowToDraw.y + rainbow.rainbowSize.h
                ) {
                    this.actualRainbowCollissionY = rainbow.rainbowPosition.facingRigth.y + rainbow.rainbowToDraw.y
                    return true
                }
            } else if (rainbow.actualRainbowDirection === "left") {
                if (
                    characterPosition.x + characterSize.w >= rainbow.rainbowPosition.facingLeft.x - rainbow.rainbowSize.w &&
                    characterPosition.y + characterSize.h >= rainbow.rainbowPosition.facingLeft.y + rainbow.rainbowToDraw.y - 5 &&
                    characterPosition.x <= rainbow.rainbowPosition.facingLeft.x - 20 &&
                    characterPosition.y < rainbow.rainbowPosition.facingLeft.y + rainbow.rainbowToDraw.y + rainbow.rainbowSize.h
                ) {
                    this.actualRainbowCollissionY = rainbow.rainbowPosition.facingLeft.y + rainbow.rainbowToDraw.y
                    return true
                }
            }

        })
    },
    createRandomEnemie() {
        if (this.framesCounter % 300 === 0) {
            this.enemies.push(new FloorEnemie(this.ctx,
                this.enemiesSources[Math.floor(Math.random() * this.enemiesSources.length)],
                2,
                Math.random() * (this.canvasSize.w - 150),
                0,
                100,
                90,
                this.starterEnemieVel[Math.floor(Math.random() * this.starterEnemieVel.length)],
                1,
                this.canvasSize.w,
                0))
            this.enemies.forEach(enem => enem.createImgEnemie())
        }
        this.enemies.forEach((enem, i) => {
            enem.enemiePosition.y > this.canvasSize.w + 90 ? this.enemies.splice(i, 1) : null
        })
    },
    isPlayerCollidingEnemies() {
        return this.enemies.some(enem => {
            return (
                this.player.playerPosition.x + this.player.playerSize.w >= enem.enemiePosition.x &&
                this.player.playerPosition.y + this.player.playerSize.h >= enem.enemiePosition.y &&
                this.player.playerPosition.x <= enem.enemiePosition.x + enem.enemieSize.w &&
                this.player.playerPosition.y < enem.enemiePosition.y + enem.enemieSize.h
            )
        })
    },
    damagePlayer() {
        if (!this.enemiesCollisionRetarder) {
            this.player.lives--
        } else if (this.enemiesCollisionRetarder === 100) {
            this.enemiesCollisionRetarder = 0
            return
        }
        this.enemiesCollisionRetarder++
    },
    isCharacterWidthAfterTileXOrigin(colIndex, characterXPosition, characterWidth) {
        return characterXPosition + characterWidth >= this.mapTSize * colIndex
    },
    isCharacterHeightOverTileYOrigin(rowIndex, characterPositionY, characterHeight) {
        return characterPositionY + characterHeight + 5 >= this.map.getTileYAxis(rowIndex)
    },
    isCharacterXOriginBeforeTileWidth(colIndex, characterXPosition) {
        return characterXPosition <= this.mapTSize * colIndex + this.mapTSize
    },
    isCharacterYOrigingOverTileYWidth(rowIndex, characterYPosition, characterHeight) {
        return characterYPosition <= this.map.getTileYAxis(rowIndex) + this.mapTSize / 10 - characterHeight
    },

    createGameInfoBoxes() {
        this.scoreImg = new Image()
        this.scoreImg.src = this.scoreBackgroundSource
    },

    drawGameInfoBoxes() {
        this.ctx.drawImage(
            this.scoreImg,
            this.canvasSize.w - 400,
            this.canvasSize.h - 107,
            350,
            60
        )
        this.ctx.drawImage(
            this.scoreImg,
            80,
            this.canvasSize.h - 107,
            300,
            60
        )

    },
    drawScore() {
        this.ctx.fillStyle = "#64571a"
        this.ctx.font = "18px 'Press Start 2P'";
        this.ctx.fillText(`SCORE: ${this.score} PTS`, this.canvasSize.w - 350, this.canvasSize.h - 65)
    },
    hasPlayerWon() {
        return (this.player.playerPosition.y + this.player.playerSize.h <= this.chest.chestPosition.y + this.chest.chestSize.h)
    },
    manageWinner() {
        if (this.hasPlayerWon()) {
            this.isPlaying = false
            this.chest.manageChestAnimation(this.framesCounter)
            this.winMessage.drawWinMessage()
            this.winMessage.animateWinMessage()
            this.manageWinnerTimeOutMenu()
        }
    },
    retardWinnerMenu() {
        this.winnerTimeOut--
    },
    manageWinnerTimeOutMenu() {
        this.winnerTimeOut <= 0 ? document.querySelector(".end-message.winner").classList.remove("inactive") : this.retardWinnerMenu()
    },
    manageLoser() {
        this.endGame()
        document.querySelector(".end-message.loser").classList.remove("inactive")
    },
    setDimensions() {
        this.canvasSize.w = window.innerWidth
        this.canvasSize.h = window.innerHeight
        this.mapTSize = this.canvasSize.w / this.mapCols
        this.basePosition.y = this.canvasSize.h - this.mapTSize * 2
        this.canvasDom.setAttribute('width', this.canvasSize.w)
        this.canvasDom.setAttribute('height', this.canvasSize.h)
    },
    resetValues() {
        this.setDimensions()
        this.enemies.splice(0, this.enemies.length)
        this.score = 0
        this.isPlaying = true
        this.winnerTimeOut = 300
    }
}