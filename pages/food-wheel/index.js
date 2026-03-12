// pages/food-wheel/index.js

// 本地存储键名
const STORAGE_KEY = 'food_wheel_items';

// 默认食物列表 (需求 6.2)
const DEFAULT_FOOD_ITEMS = [
  '肉夹馍',
  '火锅',
  '烤肉',
  '麻辣烫',
  '炸鸡',
  '披萨'
];

// 数量约束常量 (需求 2.2, 5.6, 5.7)
const MIN_FOOD_COUNT = 2;
const MAX_FOOD_COUNT = 8;

// 转盘颜色配置 - 相邻颜色不同 (需求 2.4)
const WHEEL_COLORS = [
  '#FF6B6B',  // 红色
  '#4ECDC4',  // 青色
  '#FFE66D',  // 黄色
  '#95E1D3',  // 浅绿
  '#F38181',  // 粉红
  '#AA96DA',  // 紫色
  '#FCBAD3',  // 浅粉
  '#A8D8EA',  // 浅蓝
];

// 旋转动画配置
const SPIN_CONFIG = {
  minDuration: 3000,    // 最小旋转时间 (ms)
  maxDuration: 5000,    // 最大旋转时间 (ms)
  minRotations: 5,      // 最小旋转圈数
  maxRotations: 8,      // 最大旋转圈数
};

Page({
  /**
   * 页面的初始数据
   */
  data: {
    foodItems: [],           // 食物列表
    isSpinning: false,       // 是否正在旋转
    currentAngle: 0,         // 当前角度
    selectedFood: '',        // 选中的食物
    showResult: false,       // 是否显示结果
    isEditMode: false,       // 是否编辑模式
    editingIndex: -1,        // 正在编辑的索引
    editingValue: '',        // 编辑中的文本值
    newFoodName: '',         // 新添加的食物名称
    MIN_FOOD_COUNT: MIN_FOOD_COUNT,
    MAX_FOOD_COUNT: MAX_FOOD_COUNT,
  },

  // Canvas 相关变量
  canvas: null,
  ctx: null,
  canvasWidth: 0,
  canvasHeight: 0,

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 加载食物数据
    const foodItems = this.loadFoodItems();
    this.setData({ foodItems });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.initCanvas();
  },

  /**
   * 初始化 Canvas
   */
  initCanvas: function () {
    const query = wx.createSelectorQuery();
    query.select('#wheelCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          console.error('Canvas 初始化失败');
          wx.showToast({ title: '页面加载失败，请重试', icon: 'none' });
          return;
        }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 获取设备像素比
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        // 设置 Canvas 尺寸
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        this.canvas = canvas;
        this.ctx = ctx;
        this.canvasWidth = res[0].width;
        this.canvasHeight = res[0].height;

        // 绘制转盘
        this.drawWheel();
      });
  },

  /**
   * 绘制转盘
   */
  drawWheel: function () {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const items = this.data.foodItems;
    const itemCount = items.length;
    const anglePerItem = (2 * Math.PI) / itemCount;
    const currentAngle = (this.data.currentAngle * Math.PI) / 180;

    // 清空画布
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    // 绘制扇形区域
    for (let i = 0; i < itemCount; i++) {
      const startAngle = currentAngle + i * anglePerItem - Math.PI / 2;
      const endAngle = startAngle + anglePerItem;

      // 绘制扇形
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
      ctx.fill();

      // 绘制边框
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 绘制文字
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerItem / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(items[i], radius * 0.65, 0);
      ctx.restore();
    }

    // 绘制中心圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  /**
   * 开始旋转
   */
  startSpin: function () {
    // 防止重复点击
    if (this.data.isSpinning) {
      return;
    }

    this.setData({ 
      isSpinning: true,
      showResult: false 
    });

    // 随机生成旋转时间和目标角度
    const duration = SPIN_CONFIG.minDuration + 
      Math.random() * (SPIN_CONFIG.maxDuration - SPIN_CONFIG.minDuration);
    const rotations = SPIN_CONFIG.minRotations + 
      Math.random() * (SPIN_CONFIG.maxRotations - SPIN_CONFIG.minRotations);
    const targetAngle = this.data.currentAngle + rotations * 360 + Math.random() * 360;

    this.animateSpin(duration, this.data.currentAngle, targetAngle);
  },

  /**
   * 缓动函数 - 实现加速-匀速-减速效果
   * @param {number} t - 时间进度 (0-1)
   * @returns {number} - 动画进度 (0-1)
   */
  easeInOutCubic: function (t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  /**
   * 执行旋转动画
   */
  animateSpin: function (duration, startAngle, targetAngle) {
    const startTime = Date.now();
    const that = this;

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = that.easeInOutCubic(progress);
      const currentAngle = startAngle + (targetAngle - startAngle) * easedProgress;

      that.setData({ currentAngle: currentAngle % 360 });
      that.drawWheel();

      if (progress < 1) {
        that.canvas.requestAnimationFrame(animate);
      } else {
        // 动画结束，计算结果
        const selectedFood = that.calculateResult(currentAngle);
        that.setData({
          isSpinning: false,
          showResult: true,
          selectedFood: selectedFood
        });
      }
    }

    this.canvas.requestAnimationFrame(animate);
  },

  /**
   * 计算选中结果
   * @param {number} angle - 最终角度
   * @returns {string} - 选中的食物名称
   */
  calculateResult: function (angle) {
    const items = this.data.foodItems;
    const itemCount = items.length;
    const anglePerItem = 360 / itemCount;
    
    // 指针在顶部，计算指针指向的扇形
    // 转盘顺时针旋转，角度增加
    const normalizedAngle = ((360 - (angle % 360)) + 360) % 360;
    const index = Math.floor(normalizedAngle / anglePerItem) % itemCount;
    
    return items[index];
  },

  /**
   * 重置转盘状态
   */
  resetSpin: function () {
    this.setData({
      showResult: false,
      selectedFood: ''
    });
  },

  /**
   * 从本地存储加载食物数据
   * @returns {Array<string>} - 食物列表
   */
  loadFoodItems: function () {
    try {
      const items = wx.getStorageSync(STORAGE_KEY);
      if (items && Array.isArray(items) && items.length >= MIN_FOOD_COUNT) {
        return items;
      }
      return this.getDefaultFoodItems();
    } catch (e) {
      console.error('读取本地存储失败:', e);
      return this.getDefaultFoodItems();
    }
  },

  /**
   * 获取默认食物列表
   * @returns {Array<string>} - 默认食物列表
   */
  getDefaultFoodItems: function () {
    return [...DEFAULT_FOOD_ITEMS];
  },

  /**
   * 保存食物数据到本地存储
   */
  saveFoodItems: function () {
    try {
      wx.setStorageSync(STORAGE_KEY, this.data.foodItems);
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.exitEditMode();
      this.drawWheel();
    } catch (e) {
      console.error('保存本地存储失败:', e);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    }
  },

  /**
   * 进入编辑模式
   */
  enterEditMode: function () {
    this.setData({ isEditMode: true });
  },

  /**
   * 退出编辑模式
   */
  exitEditMode: function () {
    this.setData({ 
      isEditMode: false,
      newFoodName: ''
    });
  },

  /**
   * 验证食物名称
   * @param {string} name - 食物名称
   * @returns {Object} - 验证结果
   */
  validateFoodName: function (name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, message: '请输入食物名称' };
    }
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, message: '食物名称不能为空' };
    }
    if (trimmed.length > 10) {
      return { valid: false, message: '食物名称不能超过10个字符' };
    }
    return { valid: true, value: trimmed };
  },

  /**
   * 添加食物
   */
  addFoodItem: function () {
    const validation = this.validateFoodName(this.data.newFoodName);
    if (!validation.valid) {
      wx.showToast({ title: validation.message, icon: 'none' });
      return;
    }

    if (this.data.foodItems.length >= MAX_FOOD_COUNT) {
      wx.showToast({ title: '最多支持 8 个选项', icon: 'none' });
      return;
    }

    const newItems = [...this.data.foodItems, validation.value];
    this.setData({ 
      foodItems: newItems,
      newFoodName: ''
    });
  },

  /**
   * 删除食物
   */
  deleteFoodItem: function (e) {
    const index = e.currentTarget.dataset.index;
    
    if (this.data.foodItems.length <= MIN_FOOD_COUNT) {
      wx.showToast({ title: '至少需要保留 2 个选项', icon: 'none' });
      return;
    }

    const newItems = this.data.foodItems.filter((_, i) => i !== index);
    this.setData({ foodItems: newItems });
  },

  /**
   * 修改食物名称 - 输入变化
   */
  onFoodInputChange: function (e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const newItems = [...this.data.foodItems];
    newItems[index] = value;
    this.setData({ foodItems: newItems });
  },

  /**
   * 修改食物名称 - 失去焦点时验证
   */
  onFoodInputBlur: function (e) {
    const index = e.currentTarget.dataset.index;
    const value = e.detail.value;
    const validation = this.validateFoodName(value);
    
    if (!validation.valid) {
      wx.showToast({ title: validation.message, icon: 'none' });
      // 恢复原值或使用默认值
      const newItems = [...this.data.foodItems];
      newItems[index] = DEFAULT_FOOD_ITEMS[index] || '食物';
      this.setData({ foodItems: newItems });
    }
  },

  /**
   * 新食物名称输入
   */
  onNewFoodInput: function (e) {
    this.setData({ newFoodName: e.detail.value });
  },
});
