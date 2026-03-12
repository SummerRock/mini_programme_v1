// index.js
const homePageStore = require('../../stores/home-page-store')

Page({
  data: homePageStore.data,
  onLoad: function () {
    // 页面创建时执行
    homePageStore.bind(this);
    homePageStore.init();
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    console.log('下拉刷新666')
    homePageStore.init();
  },
  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log('页面触底')
    homePageStore.loadMoreData()
  },
  cardSwiper(e) {
    // console.log('swiper', e)
  },
  collectArticle(e) {
    const {
      currentTarget: {
        dataset: {
          item = {},
        } = {},
      } = {},
    } = e;
    if (item.collect) {
      homePageStore.unCollectArticle(item)
    } else {
      homePageStore.collectArticle(item)
    }
  },
  jumpToDetail: function ({
    currentTarget: {
      dataset: {
        item,
        index = 0,
      },
    },
  }) {
    console.log('点击文章:', item)
    const url = item.link; // 跳转的外链
    const navtitle = item.title; // 这个标题是你自己可以设置的
    wx.setClipboardData({
      data: url,
      success(res) {
        wx.getClipboardData({
          success(res) {
            console.log(res.data) // data
          }
        })
      }
    })
    // wx.navigateTo({
    //   // 跳转到webview页面
    //   url: `/pages/webview/index?url=${url}&nav=${navtitle}`,
    // });
  },
})
