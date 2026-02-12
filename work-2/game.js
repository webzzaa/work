/**
 * 萌兔家园 - 游戏主逻辑
 * 包含兔子行为、游戏控制、食物系统和数据存储
 */

// ==================== 游戏配置常量 ====================
const GAME_CONFIG = {
    // 成长阶段配置（年龄以秒为单位）
    growthStages: {
        baby: { minAge: 0, maxAge: 30, scale: 0.6, name: '幼兔' },
        teen: { minAge: 30, maxAge: 60, scale: 0.8, name: '少年兔' },
        adult: { minAge: 60, maxAge: 120, scale: 1.0, name: '成年兔' },
        elder: { minAge: 120, maxAge: Infinity, scale: 1.1, name: '老年兔' }
    },
    
    // 游戏状态
    gameStates: {
        stopped: 'stopped',
        running: 'running',
        paused: 'paused'
    },
    
    // 兔子状态
    rabbitStates: {
        idle: 'idle',
        walking: 'walking',
        eating: 'eating',
        dancing: 'dancing'
    },
    
    // 舞蹈类型
    danceTypes: ['dancing', 'dancing-jump', 'dancing-sway'],
    
    // 行为权重配置
    behaviorWeights: {
        idle: 0.4,
        walking: 0.3,
        dancing: 0.2,
        eating: 0.1
    },
    
    // 移动配置
    moveConfig: {
        speed: 2,
        targetThreshold: 10,
        minMoveDistance: 20
    },
    
    // 饥饿度配置
    hungerConfig: {
        max: 100,
        decreaseRate: 0.5, // 每秒减少量
        eatAmount: 30
    },
    
    // 数据存储键名
    storageKey: 'bunnyGardenGame',
    
    // 保存间隔（毫秒）
    saveInterval: 5000
};

// ==================== 兔子类 ====================
/**
 * 兔子类 - 管理兔子的状态、行为和渲染
 */
class Rabbit {
    /**
     * 构造函数
     * @param {Object} config - 初始配置
     */
    constructor(config = {}) {
        // 位置信息
        this.x = config.x || 100;
        this.y = config.y || 300;
        
        // 状态信息
        this.age = config.age || 0; // 年龄（秒）
        this.hunger = config.hunger || 100; // 饥饿度 0-100
        this.state = config.state || GAME_CONFIG.rabbitStates.idle;
        this.growthStage = config.growthStage || 'baby';
        
        // 移动目标
        this.targetX = null;
        this.targetY = null;
        
        // 行为计时器
        this.behaviorTimer = 0;
        this.danceTimer = 0;
        this.hungerTimer = 0;
        
        // DOM元素
        this.element = null;
        
        // 心情气泡定时器
        this.moodBubbleTimer = 0;
    }
    
    /**
     * 获取当前成长阶段信息
     * @returns {Object} 阶段信息对象
     */
    getGrowthStageInfo() {
        return GAME_CONFIG.growthStages[this.growthStage] || GAME_CONFIG.growthStages.baby;
    }
    
    /**
     * 获取缩放比例
     * @returns {number} CSS缩放值
     */
    getScale() {
        return this.getGrowthStageInfo().scale;
    }
    
    /**
     * 获取状态显示名称
     * @returns {string} 状态名称
     */
    getStateName() {
        const stateNames = {
            idle: '休息中',
            walking: '走动中',
            eating: '进食中',
            dancing: '跳舞中'
        };
        return stateNames[this.state] || '未知';
    }
    
    /**
     * 创建兔子DOM元素
     * @param {HTMLElement} container - 容器元素
     */
    createElement(container) {
        const template = document.getElementById('rabbit-template');
        if (!template) {
            console.error('兔子模板未找到');
            return;
        }
        
        this.element = template.content.cloneNode(true).firstElementChild;
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        this.updateAppearance();
        
        container.appendChild(this.element);
    }
    
    /**
     * 更新兔子外观（大小、朝向等）
     */
    updateAppearance() {
        if (!this.element) return;
        
        // 移除所有状态类
        this.element.classList.remove('idle', 'walking', 'eating', 'dancing', 'jumping');
        this.element.classList.remove('baby', 'teen', 'adult', 'elder');
        
        // 添加成长阶段类
        this.element.classList.add(this.growthStage);
        
        // 添加当前状态类
        if (this.state === GAME_CONFIG.rabbitStates.idle) {
            this.element.classList.add('idle');
        } else if (this.state === GAME_CONFIG.rabbitStates.walking) {
            this.element.classList.add('walking');
        } else if (this.state === GAME_CONFIG.rabbitStates.eating) {
            this.element.classList.add('eating');
        } else if (this.state === GAME_CONFIG.rabbitStates.dancing) {
            this.element.classList.add('dancing');
        }
    }
    
    /**
     * 更新兔子位置（用于移动）
     * @param {number} deltaX - X方向移动量
     * @param {number} deltaY - Y方向移动量
     */
    move(deltaX, deltaY) {
        if (!this.element) return;
        
        this.x += deltaX;
        this.y += deltaY;
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        
        // 根据移动方向翻转兔子
        if (deltaX > 0) {
            this.element.classList.add('facing-left');
        } else if (deltaX < 0) {
            this.element.classList.remove('facing-left');
        }
    }
    
    /**
     * 设置移动目标点
     * @param {number} x - 目标X坐标
     * @param {number} y - 目标Y坐标
     */
    setTarget(x, y) {
        this.targetX = x;
        this.targetY = y;
    }
    
    /**
     * 清空移动目标
     */
    clearTarget() {
        this.targetX = null;
        this.targetY = null;
    }
    
    /**
     * 检查是否到达目标点
     * @returns {boolean} 是否到达
     */
    hasReachedTarget() {
        if (this.targetX === null || this.targetY === null) return false;
        
        const distance = Math.sqrt(
            Math.pow(this.targetX - this.x, 2) + 
            Math.pow(this.targetY - this.y, 2)
        );
        
        return distance < GAME_CONFIG.moveConfig.targetThreshold;
    }
    
    /**
     * 更新成长阶段
     */
    updateGrowthStage() {
        const stages = Object.keys(GAME_CONFIG.growthStages);
        let newStage = this.growthStage;
        
        for (const stage of stages) {
            const info = GAME_CONFIG.growthStages[stage];
            if (this.age >= info.minAge && this.age < info.maxAge) {
                newStage = stage;
                break;
            }
        }
        
        if (newStage !== this.growthStage) {
            this.growthStage = newStage;
            this.updateAppearance();
            return true; // 阶段改变
        }
        return false;
    }
    
    /**
     * 增加年龄
     * @param {number} seconds - 增加的秒数
     */
    increaseAge(seconds) {
        this.age += seconds;
        return this.updateGrowthStage();
    }
    
    /**
     * 更新饥饿度
     * @param {number} amount - 变化量（负数为减少）
     */
    updateHunger(amount) {
        this.hunger = Math.max(0, Math.min(GAME_CONFIG.hungerConfig.max, this.hunger + amount));
    }
    
    /**
     * 获取饥饿状态描述
     * @returns {string} 饥饿状态描述
     */
    getHungerStatus() {
        if (this.hunger > 70) return '很饱';
        if (this.hunger > 40) return '正常';
        if (this.hunger > 20) return '有点饿';
        return '很饿';
    }
    
    /**
     * 显示心情气泡
     * @param {string} emoji - 心情表情
     * @param {HTMLElement} scene - 场景元素
     */
    showMoodBubble(emoji, scene) {
        const template = document.getElementById('bubble-template');
        if (!template) return;
        
        const bubble = template.content.cloneNode(true).firstElementChild;
        bubble.textContent = emoji;
        // 根据成长阶段调整气泡位置
        const pixelSize = this.growthStage === 'baby' ? 3 : this.growthStage === 'teen' ? 4 : 5;
        const offsetX = 13 * pixelSize / 2;
        bubble.style.left = `${this.x + offsetX}px`;
        bubble.style.top = `${this.y - 10}px`;
        
        scene.appendChild(bubble);
        
        // 动画结束后移除
        setTimeout(() => {
            if (bubble.parentNode) {
                bubble.parentNode.removeChild(bubble);
            }
        }, 2000);
    }
    
    /**
     * 执行进食
     */
    eat() {
        this.state = GAME_CONFIG.rabbitStates.eating;
        this.updateAppearance();
        
        setTimeout(() => {
            this.state = GAME_CONFIG.rabbitStates.idle;
            this.updateAppearance();
        }, 500);
    }
    
    /**
     * 开始跳舞
     */
    startDancing() {
        this.state = GAME_CONFIG.rabbitStates.dancing;
        this.danceTimer = 2000; // 跳舞持续2秒
        this.updateAppearance();
    }
    
    /**
     * 停止跳舞
     */
    stopDancing() {
        if (this.state === GAME_CONFIG.rabbitStates.dancing) {
            this.state = GAME_CONFIG.rabbitStates.idle;
            this.updateAppearance();
        }
    }
    
    /**
     * 获取数据对象（用于保存）
     * @returns {Object} 数据对象
     */
    toData() {
        return {
            x: this.x,
            y: this.y,
            age: this.age,
            hunger: this.hunger,
            state: this.state,
            growthStage: this.growthStage
        };
    }
    
    /**
     * 从数据对象加载
     * @param {Object} data - 数据对象
     * @returns {Rabbit} 兔子实例
     */
    static fromData(data) {
        const rabbit = new Rabbit(data);
        return rabbit;
    }
}

// ==================== 食物类 ====================
/**
 * 食物类 - 管理食物的创建、显示和状态
 */
class Food {
    /**
     * 构造函数
     * @param {string} type - 食物类型
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.element = null;
    }
    
    /**
     * 获取食物类型名称
     * @returns {string} 类型名称
     */
    getTypeName() {
        const typeNames = {
            grass: '草料',
            water: '水',
            carrot: '胡萝卜',
            berry: '浆果'
        };
        return typeNames[this.type] || '未知';
    }
    
    /**
     * 获取饱腹感值
     * @returns {number} 饱腹感值
     */
    getSatietyValue() {
        const values = {
            grass: 15,
            water: 10,
            carrot: 25,
            berry: 20
        };
        return values[this.type] || 10;
    }
    
    /**
     * 创建食物DOM元素
     * @param {HTMLElement} container - 容器元素
     */
    createElement(container) {
        const template = document.getElementById('food-template');
        if (!template) {
            console.error('食物模板未找到');
            return;
        }
        
        this.element = template.content.cloneNode(true).firstElementChild;
        this.element.classList.add(this.type);
        
        // 设置CSS变量用于像素大小
        this.element.style.setProperty('--pixel-size', '3px');
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        
        container.appendChild(this.element);
    }
    
    /**
     * 被吃掉的动画和清理
     */
    eaten() {
        if (!this.element) return;
        
        this.element.classList.add('eaten');
        
        setTimeout(() => {
            if (this.element && this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
        }, 500);
    }
    
    /**
     * 获取数据对象（用于保存）
     * @returns {Object} 数据对象
     */
    toData() {
        return {
            type: this.type,
            x: this.x,
            y: this.y
        };
    }
    
    /**
     * 从数据对象创建食物
     * @param {Object} data - 数据对象
     * @param {HTMLElement} container - 容器元素
     * @returns {Food} 食物实例
     */
    static fromData(data, container) {
        const food = new Food(data.type, data.x, data.y);
        food.createElement(container);
        return food;
    }
}

// ==================== 游戏主类 ====================
/**
 * 游戏主类 - 管理游戏循环、状态和交互
 */
class Game {
    /**
     * 构造函数
     */
    constructor() {
        // 游戏状态
        this.state = GAME_CONFIG.gameStates.stopped;
        
        // 食物放置模式
        this.placementMode = null; // null=普通模式, 'grass'/'water'/'carrot'/'berry'=放置模式
        
        // DOM元素引用
        this.scene = null;
        this.gameElements = null;
        
        // 游戏对象
        this.rabbit = null;
        this.foods = [];
        
        // 定时器
        this.gameLoopTimer = null;
        this.saveTimer = null;
        this.lastTime = 0;
        
        // 绑定方法
        this.gameLoop = this.gameLoop.bind(this);
        this.handleClick = this.handleClick.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
    }
    
    /**
     * 初始化游戏
     */
    init() {
        // 获取DOM元素
        this.scene = document.getElementById('game-scene');
        this.gameElements = document.getElementById('game-elements');
        
        if (!this.scene || !this.gameElements) {
            console.error('游戏场景元素未找到');
            return;
        }
        
        // 加载保存的游戏状态或创建新的
        this.loadOrCreateGame();
        
        // 绑定事件
        this.bindEvents();
        
        // 绑定控制按钮
        this.bindControlButtons();
        
        // 绑定喂食按钮
        this.bindFeedingButtons();
        
        // 开始自动保存
        this.startAutoSave();
        
        // 更新UI
        this.updateUI();
    }
    
    /**
     * 加载保存的游戏或创建新游戏
     */
    loadOrCreateGame() {
        const savedData = this.loadGameData();
        
        if (savedData) {
            // 从保存数据恢复
            this.rabbit = Rabbit.fromData(savedData.rabbit);
            
            // 恢复食物
            this.gameElements.innerHTML = '';
            this.foods = [];
            savedData.foods.forEach(foodData => {
                const food = Food.fromData(foodData, this.gameElements);
                this.foods.push(food);
            });
        } else {
            // 创建新的兔子
            this.rabbit = new Rabbit();
            this.rabbit.createElement(this.gameElements);
            this.foods = [];
        }
    }
    
    /**
     * 绑定场景事件
     */
    bindEvents() {
        // 点击场景引导兔子移动
        this.scene.addEventListener('click', this.handleClick);
    }
    
    /**
     * 处理场景点击
     * @param {Event} event - 点击事件
     */
    handleClick(event) {
        // 获取点击位置
        const rect = this.scene.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // 如果在放置模式，放置食物
        if (this.placementMode) {
            this.placeFoodAtPosition(this.placementMode, x, y);
            this.placementMode = null;
            this.updatePlacementUI();
            return;
        }
        
        // 普通点击模式 - 如果游戏在运行，引导兔子移动
        if (this.state !== GAME_CONFIG.gameStates.running) return;
        
        // 设置兔子移动目标
        this.rabbit.setTarget(x, y);
        this.rabbit.state = GAME_CONFIG.rabbitStates.walking;
        this.rabbit.updateAppearance();
    }
    
    /**
     * 在指定位置放置食物
     * @param {string} type - 食物类型
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     */
    placeFoodAtPosition(type, x, y) {
        const food = new Food(type, x, y);
        food.createElement(this.gameElements);
        this.foods.push(food);
        
        // 如果兔子饿了，引导它去吃
        if (this.rabbit && this.rabbit.hunger < 50) {
            this.goToNearestFood();
        }
    }
    
    /**
     * 处理鼠标移动（拖拽）
     * @param {Event} event - 鼠标移动事件
     */
    handleMouseMove(event) {
        // 暂不实现拖拽功能，可扩展
    }
    
    /**
     * 绑定控制按钮
     */
    bindControlButtons() {
        const btnStart = document.getElementById('btn-start');
        const btnPause = document.getElementById('btn-pause');
        const btnReset = document.getElementById('btn-reset');
        
        if (btnStart) {
            btnStart.addEventListener('click', () => this.start());
        }
        
        if (btnPause) {
            btnPause.addEventListener('click', () => this.pause());
        }
        
        if (btnReset) {
            btnReset.addEventListener('click', () => this.reset());
        }
    }
    
    /**
     * 绑定喂食按钮
     */
    bindFeedingButtons() {
        const btnAddGrass = document.getElementById('btn-add-grass');
        const btnAddWater = document.getElementById('btn-add-water');
        const btnAddCarrot = document.getElementById('btn-add-carrot');
        const btnAddBerry = document.getElementById('btn-add-berry');
        
        if (btnAddGrass) {
            btnAddGrass.addEventListener('click', () => {
                this.placementMode = 'grass';
                this.updatePlacementUI();
            });
        }
        
        if (btnAddWater) {
            btnAddWater.addEventListener('click', () => {
                this.placementMode = 'water';
                this.updatePlacementUI();
            });
        }
        
        if (btnAddCarrot) {
            btnAddCarrot.addEventListener('click', () => {
                this.placementMode = 'carrot';
                this.updatePlacementUI();
            });
        }
        
        if (btnAddBerry) {
            btnAddBerry.addEventListener('click', () => {
                this.placementMode = 'berry';
                this.updatePlacementUI();
            });
        }
    }
    
    /**
     * 更新放置模式的UI显示
     */
    updatePlacementUI() {
        const buttons = [
            document.getElementById('btn-add-grass'),
            document.getElementById('btn-add-water'),
            document.getElementById('btn-add-carrot'),
            document.getElementById('btn-add-berry')
        ];
        
        buttons.forEach(btn => {
            if (!btn) return;
            
            const type = btn.id.replace('btn-add-', '');
            if (this.placementMode === type) {
                btn.style.border = '3px solid #333';
                btn.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.3)';
                btn.style.transform = 'scale(1.05)';
            } else {
                btn.style.border = '';
                btn.style.boxShadow = '';
                btn.style.transform = '';
            }
        });
        
        // 更新场景光标
        if (this.scene) {
            if (this.placementMode) {
                this.scene.style.cursor = 'crosshair';
                this.scene.style.boxShadow = 'inset 0 0 50px rgba(255, 182, 193, 0.5)';
            } else {
                this.scene.style.cursor = 'default';
                this.scene.style.boxShadow = '';
            }
        }
        
        // 显示放置提示
        if (this.placementMode) {
            const typeNames = {
                grass: '草料',
                water: '水',
                carrot: '胡萝卜',
                berry: '浆果'
            };
            const statusElement = document.getElementById('rabbit-status');
            if (statusElement) {
                statusElement.textContent = `点击场景放置${typeNames[this.placementMode]}`;
                statusElement.style.color = '#FF6B6B';
            }
        } else {
            const statusElement = document.getElementById('rabbit-status');
            if (statusElement && this.rabbit) {
                statusElement.textContent = this.rabbit.getStateName();
                statusElement.style.color = '';
            }
        }
    }
    
    /**
     * 开始游戏
     */
    start() {
        if (this.state === GAME_CONFIG.gameStates.running) return;
        
        this.state = GAME_CONFIG.gameStates.running;
        this.lastTime = performance.now();
        
        // 开始游戏循环
        this.gameLoopTimer = requestAnimationFrame(this.gameLoop);
        
        // 显示开始心情
        if (this.rabbit) {
            this.rabbit.showMoodBubble('🐰', this.scene);
        }
        
        this.updateUI();
    }
    
    /**
     * 暂停游戏
     */
    pause() {
        if (this.state !== GAME_CONFIG.gameStates.running) return;
        
        this.state = GAME_CONFIG.gameStates.paused;
        
        // 停止游戏循环
        if (this.gameLoopTimer) {
            cancelAnimationFrame(this.gameLoopTimer);
            this.gameLoopTimer = null;
        }
        
        // 停止跳舞
        if (this.rabbit) {
            this.rabbit.stopDancing();
        }
        
        this.updateUI();
    }
    
    /**
     * 重置游戏
     */
    reset() {
        // 停止游戏
        this.pause();
        this.state = GAME_CONFIG.gameStates.stopped;
        
        // 清理场景
        if (this.gameElements) {
            this.gameElements.innerHTML = '';
        }
        
        // 清空食物数组
        this.foods = [];
        
        // 创建新的兔子
        this.rabbit = new Rabbit();
        this.rabbit.createElement(this.gameElements);
        
        // 清除保存的数据
        this.clearSaveData();
        
        // 更新UI
        this.updateUI();
    }
    
    /**
     * 游戏主循环
     * @param {number} currentTime - 当前时间戳
     */
    gameLoop(currentTime) {
        if (this.state !== GAME_CONFIG.gameStates.running) return;
        
        // 计算时间差（秒）
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // 更新兔子年龄
        if (this.rabbit) {
            const stageChanged = this.rabbit.increaseAge(deltaTime);
            if (stageChanged) {
                this.rabbit.showMoodBubble('🎉', this.scene);
            }
        }
        
        // 更新饥饿度
        if (this.rabbit) {
            this.rabbit.hungerTimer += deltaTime * 1000;
            if (this.rabbit.hungerTimer >= 1000) {
                this.rabbit.hungerTimer = 0;
                this.rabbit.updateHunger(-GAME_CONFIG.hungerConfig.decreaseRate);
            }
        }
        
        // 兔子行为更新
        this.updateRabbitBehavior(deltaTime);
        
        // 兔子移动
        this.updateRabbitMovement();
        
        // 检查食物碰撞
        this.checkFoodCollision();
        
        // 随机心情显示
        this.updateMoodBubbles(deltaTime);
        
        // 继续循环
        this.gameLoopTimer = requestAnimationFrame(this.gameLoop);
    }
    
    /**
     * 更新兔子行为
     * @param {number} deltaTime - 时间差（秒）
     */
    updateRabbitBehavior(deltaTime) {
        if (!this.rabbit) return;
        
        // 跳舞计时器
        if (this.rabbit.danceTimer > 0) {
            this.rabbit.danceTimer -= deltaTime * 1000;
            if (this.rabbit.danceTimer <= 0) {
                this.rabbit.stopDancing();
            }
        }
        
        // 行为计时器
        this.rabbit.behaviorTimer += deltaTime * 1000;
        
        // 每2秒随机选择行为
        if (this.rabbit.behaviorTimer >= 2000) {
            this.rabbit.behaviorTimer = 0;
            this.randomBehavior();
        }
    }
    
    /**
     * 随机选择兔子行为
     */
    randomBehavior() {
        // 如果有移动目标，不改变行为
        if (this.rabbit.targetX !== null) {
            return;
        }
        
        // 如果正在进食，不改变行为
        if (this.rabbit.state === GAME_CONFIG.rabbitStates.eating) {
            return;
        }
        
        // 根据权重随机选择行为
        const weights = GAME_CONFIG.behaviorWeights;
        const behaviors = Object.keys(weights);
        const random = Math.random();
        
        let cumulative = 0;
        let selectedBehavior = behaviors[0];
        
        for (const behavior of behaviors) {
            cumulative += weights[behavior];
            if (random < cumulative) {
                selectedBehavior = behavior;
                break;
            }
        }
        
        // 如果兔子很饿，提高进食权重
        if (this.rabbit.hunger < 30 && this.foods.length > 0) {
            // 寻找最近的食物
            this.goToNearestFood();
            return;
        }
        
        // 应用选择的行为
        this.rabbit.state = selectedBehavior;
        
        // 跳舞时随机选择类型
        if (selectedBehavior === GAME_CONFIG.rabbitStates.dancing) {
            this.rabbit.startDancing();
            // 30%概率显示心情
            if (Math.random() < 0.3) {
                const happyEmojis = ['💃', '🕺', '开心', '啦啦啦'];
                const emoji = happyEmojis[Math.floor(Math.random() * happyEmojis.length)];
                this.rabbit.showMoodBubble(emoji, this.scene);
            }
        } else {
            this.rabbit.updateAppearance();
        }
        
        // 行走时随机选择目的地
        if (selectedBehavior === GAME_CONFIG.rabbitStates.walking) {
            this.randomWalk();
        }
    }
    
    /**
     * 随机行走
     */
    randomWalk() {
        const sceneRect = this.scene.getBoundingClientRect();
        const padding = 100;
        
        const x = padding + Math.random() * (sceneRect.width - padding * 2);
        const y = padding + Math.random() * (sceneRect.height - padding * 2);
        
        this.rabbit.setTarget(x, y);
    }
    
    /**
     * 寻找最近的食物
     */
    goToNearestFood() {
        if (!this.rabbit || this.foods.length === 0) return;
        
        let nearestFood = null;
        let nearestDistance = Infinity;
        
        this.foods.forEach(food => {
            const distance = Math.sqrt(
                Math.pow(food.x - this.rabbit.x, 2) + 
                Math.pow(food.y - this.rabbit.y, 2)
            );
            
            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestFood = food;
            }
        });
        
        if (nearestFood) {
            this.rabbit.setTarget(nearestFood.x, nearestFood.y);
            this.rabbit.state = GAME_CONFIG.rabbitStates.walking;
            this.rabbit.updateAppearance();
        }
    }
    
    /**
     * 更新兔子移动
     */
    updateRabbitMovement() {
        if (!this.rabbit || this.rabbit.targetX === null) return;
        
        // 检查是否到达目标
        if (this.rabbit.hasReachedTarget()) {
            this.rabbit.clearTarget();
            this.rabbit.state = GAME_CONFIG.rabbitStates.idle;
            this.rabbit.updateAppearance();
            return;
        }
        
        // 计算移动方向
        const dx = this.rabbit.targetX - this.rabbit.x;
        const dy = this.rabbit.targetY - this.rabbit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > GAME_CONFIG.moveConfig.targetThreshold) {
            // 归一化并应用速度
            const moveX = (dx / distance) * GAME_CONFIG.moveConfig.speed;
            const moveY = (dy / distance) * GAME_CONFIG.moveConfig.speed;
            
            this.rabbit.move(moveX, moveY);
        } else {
            // 到达目标
            this.rabbit.x = this.rabbit.targetX;
            this.rabbit.y = this.rabbit.targetY;
            this.rabbit.clearTarget();
            
            // 如果到达时有食物，吃掉它
            this.checkFoodCollision();
            
            // 如果饿了但没食物，显示饥饿心情
            if (this.rabbit.hunger < 30 && this.foods.length === 0) {
                if (Math.random() < 0.3) {
                    this.rabbit.showMoodBubble('😢', this.scene);
                }
            } else {
                this.rabbit.state = GAME_CONFIG.rabbitStates.idle;
                this.rabbit.updateAppearance();
            }
        }
    }
    
    /**
     * 检查食物碰撞
     */
    checkFoodCollision() {
        if (!this.rabbit || this.foods.length === 0) return;
        
        // 根据像素大小计算碰撞距离
        const pixelSize = this.rabbit.growthStage === 'baby' ? 3 : this.rabbit.growthStage === 'teen' ? 4 : 5;
        const eatDistance = 13 * pixelSize / 2 + 15;
        
        for (let i = this.foods.length - 1; i >= 0; i--) {
            const food = this.foods[i];
            const distance = Math.sqrt(
                Math.pow(food.x - this.rabbit.x, 2) + 
                Math.pow(food.y - this.rabbit.y, 2)
            );
            
            if (distance < eatDistance) {
                // 兔子吃掉食物
                this.rabbit.eat();
                this.rabbit.updateHunger(food.getSatietyValue());
                this.rabbit.showMoodBubble('😋', this.scene);
                
                // 移除食物
                food.eaten();
                this.foods.splice(i, 1);
                
                break;
            }
        }
    }
    
    /**
     * 更新心情气泡显示
     * @param {number} deltaTime - 时间差（秒）
     */
    updateMoodBubbles(deltaTime) {
        if (!this.rabbit) return;
        
        this.rabbit.moodBubbleTimer += deltaTime * 1000;
        
        // 每10秒随机显示心情
        if (this.rabbit.moodBubbleTimer >= 10000) {
            this.rabbit.moodBubbleTimer = 0;
            
            // 根据状态显示不同心情
            let emoji = '❤️';
            if (this.rabbit.hunger < 20) {
                emoji = '😫';
            } else if (this.rabbit.hunger > 80) {
                emoji = '😊';
            } else if (this.rabbit.state === GAME_CONFIG.rabbitStates.dancing) {
                emoji = '💃';
            } else if (this.rabbit.state === GAME_CONFIG.rabbitStates.walking) {
                emoji = '🚶';
            }
            
            this.rabbit.showMoodBubble(emoji, this.scene);
        }
    }
    
    /**
     * 添加食物
     * @param {string} type - 食物类型
     */
    addFood(type) {
        const sceneRect = this.scene.getBoundingClientRect();
        
        // 随机位置（靠近底部）
        const x = 50 + Math.random() * (sceneRect.width - 100);
        const y = sceneRect.height - 100 + Math.random() * 50;
        
        const food = new Food(type, x, y);
        food.createElement(this.gameElements);
        this.foods.push(food);
        
        // 如果兔子饿了，引导它去吃
        if (this.rabbit && this.rabbit.hunger < 50) {
            this.goToNearestFood();
        }
    }
    
    /**
     * 保存游戏数据到localStorage
     */
    saveGame() {
        const data = {
            rabbit: this.rabbit.toData(),
            foods: this.foods.map(food => food.toData()),
            timestamp: new Date().toISOString()
        };
        
        try {
            localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify(data));
        } catch (error) {
            console.error('保存游戏数据失败:', error);
        }
    }
    
    /**
     * 从localStorage加载游戏数据
     * @returns {Object|null} 游戏数据或null
     */
    loadGameData() {
        try {
            const data = localStorage.getItem(GAME_CONFIG.storageKey);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('加载游戏数据失败:', error);
        }
        return null;
    }
    
    /**
     * 清除保存的游戏数据
     */
    clearSaveData() {
        try {
            localStorage.removeItem(GAME_CONFIG.storageKey);
        } catch (error) {
            console.error('清除游戏数据失败:', error);
        }
    }
    
    /**
     * 开始自动保存
     */
    startAutoSave() {
        this.saveTimer = setInterval(() => {
            if (this.state === GAME_CONFIG.gameStates.running) {
                this.saveGame();
            }
        }, GAME_CONFIG.saveInterval);
    }
    
    /**
     * 停止自动保存
     */
    stopAutoSave() {
        if (this.saveTimer) {
            clearInterval(this.saveTimer);
            this.saveTimer = null;
        }
    }
    
    /**
     * 更新UI显示
     */
    updateUI() {
        // 更新状态显示
        const statusElement = document.getElementById('rabbit-status');
        if (statusElement && this.rabbit) {
            statusElement.textContent = this.rabbit.getStateName();
        }
        
        // 更新成长阶段
        const stageElement = document.getElementById('growth-stage');
        if (stageElement && this.rabbit) {
            stageElement.textContent = this.rabbit.getGrowthStageInfo().name;
        }
        
        // 更新饥饿度条
        const hungerFill = document.getElementById('hunger-fill');
        if (hungerFill && this.rabbit) {
            hungerFill.style.width = `${this.rabbit.hunger}%`;
        }
        
        // 更新按钮状态
        const btnStart = document.getElementById('btn-start');
        const btnPause = document.getElementById('btn-pause');
        
        if (btnStart) {
            btnStart.disabled = this.state === GAME_CONFIG.gameStates.running;
        }
        
        if (btnPause) {
            btnPause.disabled = this.state !== GAME_CONFIG.gameStates.running;
        }
    }
}

// ==================== 游戏启动 ====================
/**
 * 页面加载完成后初始化游戏
 */
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
    
    // 暴露到全局以便调试
    window.game = game;
    
    // 页面关闭前保存游戏
    window.addEventListener('beforeunload', () => {
        game.saveGame();
    });
});
