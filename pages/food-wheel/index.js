var KEY = 'flist';
var DEFAULT_FOODS = ['火锅', '烤肉', '披萨', '汉堡', '面条', '炸鸡'];

Page({
  data: {
    foods: [],
    angle: 0,
    running: false,
    showRes: false,
    res: '',
    showEdit: false,
    newF: ''
  },

  onLoad: function() {
    this.init();
  },

  init: function() {
    var f = wx.getStorageSync(KEY);
    if (!f || f.length < 2) {
      f = DEFAULT_FOODS.slice(0);
    }
    this.setData({ foods: f });
  },

  spin: function() {
    if (this.data.running) return;
    var that = this;
    this.setData({ running: true, showRes: false });
    
    var start = this.data.angle;
    var end = start + 1800 + Math.random() * 720;
    var duration = 4000;
    var startTime = Date.now();
    
    function tick() {
      var elapsed = Date.now() - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var ease = 1 - Math.pow(1 - progress, 3);
      var currentAngle = start + (end - start) * ease;
      
      that.setData({ angle: currentAngle });
      
      if (progress < 1) {
        setTimeout(tick, 16);
      } else {
        that.showResult(currentAngle);
      }
    }
    tick();
  },

  showResult: function(angle) {
    var foods = this.data.foods;
    var count = foods.length;
    var perSlice = 360 / count;
    var normalized = ((360 - (angle % 360)) + 360) % 360;
    var index = Math.floor(normalized / perSlice) % count;
    
    this.setData({
      running: false,
      showRes: true,
      res: foods[index]
    });
  },

  hideRes: function() {
    this.setData({ showRes: false });
  },

  edit: function() {
    this.setData({ showEdit: true, newF: '' });
  },

  cancelE: function() {
    this.init();
    this.setData({ showEdit: false });
  },

  saveE: function() {
    var foods = this.data.foods;
    var filtered = [];
    for (var i = 0; i < foods.length; i++) {
      if (foods[i] && foods[i].trim()) {
        filtered.push(foods[i].trim());
      }
    }
    if (filtered.length < 2) {
      wx.showToast({ title: '至少2项', icon: 'none' });
      return;
    }
    wx.setStorageSync(KEY, filtered);
    this.setData({ foods: filtered, showEdit: false });
  },

  chg: function(e) {
    var index = e.currentTarget.dataset.i;
    var foods = this.data.foods.slice(0);
    foods[index] = e.detail.value;
    this.setData({ foods: foods });
  },

  del: function(e) {
    if (this.data.foods.length <= 2) {
      wx.showToast({ title: '至少2项', icon: 'none' });
      return;
    }
    var index = e.currentTarget.dataset.i;
    var foods = [];
    for (var i = 0; i < this.data.foods.length; i++) {
      if (i !== index) {
        foods.push(this.data.foods[i]);
      }
    }
    this.setData({ foods: foods });
  },

  newInput: function(e) {
    this.setData({ newF: e.detail.value });
  },

  addF: function() {
    var name = this.data.newF.trim();
    if (!name) return;
    if (this.data.foods.length >= 8) {
      wx.showToast({ title: '最多8项', icon: 'none' });
      return;
    }
    var foods = this.data.foods.slice(0);
    foods.push(name);
    this.setData({ foods: foods, newF: '' });
  }
});
