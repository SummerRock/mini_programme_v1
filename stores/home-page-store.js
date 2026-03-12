
const { Store } = require('westore')
const requestApi = require('../network/requestApi');
const api = require('../network/api');
const { PAGE_SIZE } = require('../network/constants');

class HomePageStore extends Store {
  constructor() {
    super()
    this.data = {
      banner: [],
      pagerList: [],
      pagernumber: 0,
      pageOver: false,
      loadingMore: false,
      collectInfoMap: {}
    }
  }

  init() {
    requestApi.get(api.banner).then((res) => {
      this.data.banner = res;
      this.update();
    }).catch((errMsg) => {
      console.error('home-page', errMsg)
    });
    this.getIndexPagerData()
  }

  getIndexPagerData() {
    wx.showNavigationBarLoading()
    this.data.pagernumber = 0
    this.update()
    requestApi.get(api.articleList.replace("$1", this.data.pagernumber).replace("$2", '20'))
      .then((res) => {
        // 隐藏导航栏加载框
        wx.hideNavigationBarLoading();
        // 停止下拉动作
        wx.stopPullDownRefresh();
        this.data.pagerList = res.datas
        this.data.pagernumber = res.curPage
        this.update()
      }).catch((errMsg) => {
        // 隐藏导航栏加载框
        wx.hideNavigationBarLoading();
        // 停止下拉动作
        wx.stopPullDownRefresh();
      });
  }

  loadMoreData() {
    this.data.loadingMore = true
    this.update();
    requestApi.get(api.articleList.replace("$1", this.data.pagernumber).replace("$2", '20'))
      .then((res) => {
        this.data.loadingMore = false
        this.data.pagernumber = res.curPage
        this.data.pagerList = this.data.pagerList.concat(res.datas)
        this.update()
      }).catch((errMsg) => {
        this.data.loadingMore = false
        this.update()
      });
  }

  collectArticle(item) {
    requestApi.post(api.collect.replace("$1", item.id))
      .then((res) => {
        const list = this.data.pagerList
        for (const el of list) {
          if (el.id === item.id) {
            el.collect = true
          }
        }
        this.update()
      }).catch((errMsg) => {
        console.log('收藏失败', errMsg)
      });
  }

  unCollectArticle(item) {
    requestApi.post(api.uncollect_originId.replace("$1", item.id))
      .then((res) => {
        console.log('xiayan', res)
        const list = this.data.pagerList
        for (const el of list) {
          if (el.id === item.id) {
            el.collect = false
          }
        }
        this.update()
      }).catch((errMsg) => {
        console.log('取消收藏失败', errMsg)
      });
  }
}


module.exports = new HomePageStore
