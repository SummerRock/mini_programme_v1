import { BehaviorWithStore } from "mobx-miniprogram-bindings";
import { global } from "./models/index";

export const testBehavior = BehaviorWithStore({
  storeBindings: [{
    namespace: "global",
    store: global,
    fields: ["pagerList", "pagernumber", "loadingMore", "myCollectCount"],
    actions: ["requestMyCollectList", "requestCancelCollectArticle", "cleanData"],
  }]
});
