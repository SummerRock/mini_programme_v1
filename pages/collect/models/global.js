import { observable, action, runInAction } from "mobx-miniprogram";

const util = require('../../../network/requestApi');
const api = require('../../../network/api');

export const global = observable({
  pagerList: [],
  pagernumber: 0,
  loadingMore: false,
  pageOver: true,

  get myCollectCount() {
    return this.pagerList.length
  },

  cleanData: action(function () {
    this.pagerList = []
    this.pagernumber = 0
    this.loadingMore = false
    this.pageOver = true
  }),

  requestMyCollectList: action(function () {
    this.loadingMore = false
    console.log('collect-page-number', this.pagernumber)
    util.get(api.selfCollect.replace("$1", this.pagernumber).replace("$2", '20'))
      .then((res) => {
        console.log('xiayan-res', res)
        runInAction(() => {
          this.loadingMore = false
          this.pagerList = res.datas
          this.pagernumber = res.curPage
          this.pageOver = res.over
        })
      }).catch((errMsg) => {
        console.log('我的收藏请求失败', errMsg)
        this.loadingMore = false
      });
  }),
  requestCancelCollectArticle: action(function (data) {
    const {
      currentTarget: {
        dataset: {
          item,
        }
      }
    } = data
    util.post(api.uncollect.replace("$1", item.id), { originId: item.originId })
      .then((res) => {
        console.log('取消收藏成功', res)
        const filtered = this.pagerList.filter((value, index, arr) => {
          return value.id !== item.id;
        });
        runInAction(() => {
          this.pagerList = filtered
        })
      }).catch((errMsg) => {
        console.log('取消收藏失败', errMsg)
      });
  }),
});
