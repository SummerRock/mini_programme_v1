// pages/search/index.js

const util = require('../../network/requestApi');
const api = require('../../network/api');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    pagernumber: 0,
    showBottomNavi: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      search: this.search.bind(this),
    })
  },

  search: function (value) {
    this.setData({
      pagernumber: 0,
      showBottomNavi: false
    })
    return new Promise((resolve, reject) => {
      util.post(api.search.replace("$1", this.data.pagernumber).replace("$2", '20'), { k: value }).then((res) => {
        console.log('xiayan-q', res)
        if (!res.datas || res.datas.length === 0) {
          resolve([])
        } else {
          this.setData({
            showBottomNavi: true
          })
          const searchResult = []
          for (const item of res.datas) {
            searchResult.push({ text: item.title.replace(/<\/?em[^>]*>/g, ''), value: item })
          }
          resolve(searchResult)
        }
      }).catch((e) => {
        console.log('search-error', e)
        reject('搜索发生错误')
      });
    })
  },

  selectResult: function (e) {
    const item = e.detail.item
    console.log('select result', item)
    wx.setClipboardData({
      data: item.value.link,
      success(res) {
        wx.getClipboardData({
          success(res) {
            console.log(res.data) // data
          }
        })
      }
    })
  },
})