import { products, stages } from "../data/catalog.js";
import { icon } from "./icons.js";
import { escape } from "../core/dom.js";
import { poster, supported } from "../rendering/clay.js";
// 每次渲染接收最新状态快照；此模块只生成 HTML，不注册事件或写入存储。
export function createViews({
  selected,
  route,
  id,
  phase,
  progress,
  sound,
  filter,
  personFilter,
  search,
  orderFilter,
  qty,
  photo,
  favs,
  orders,
  addresses,
  cart,
  count,
  total,
}) {
  const status = () =>
    `<div class="status"><span>9:41</span><span class="status-right">▥ ${icon("wifi")}${icon("battery")}</span></div>`;
  function nav() {
    return `<nav class="navbar" aria-label="主导航">${[
      ["home", "craft", "制泥"],
      ["people", "people", "传承"],
      ["shop", "shop", "好物"],
      ["me", "me", "我的"],
    ]
      .map(
        ([r, i, t]) =>
          `<button data-go="${r}" class="${route === r ? "active" : ""}" ${route === r ? 'aria-current="page"' : ""}>${icon(i)}<span>${t}</span></button>`,
      )
      .join("")}</nav>`;
  }
  const cartButton = () =>
    `<button class="icon-btn" data-go="cart" aria-label="购物车">${icon("shop")}${count() ? `<span class="counter">${count()}</span>` : ""}</button>`;
  const subtop = (title, back, extra = "") =>
    `<header class="subtop"><button class="icon-btn" data-go="${back}" aria-label="返回">${icon("back")}</button><span class="center">${title}</span>${extra || '<span style="width:28px"></span>'}</header>`;
  function home() {
    return `<header class="top"><div><div class="brand">泥途</div><p class="brand-note">让泥土有生命</p></div><button class="icon-btn" id="about" aria-label="关于泥途">${icon("leaf")}</button></header><div class="home-heading"><h1 class="title">一捧泥，一份乡情</h1></div><div class="home-scene"><div class="model-canvas" id="model"></div><button class="arrow-prev" id="prev-model" aria-label="上一件泥塑">‹</button><button class="arrow-next" id="next-model" aria-label="下一件泥塑">›</button></div><div class="model-caption"><h2 id="model-title">${products[selected].name}</h2><div class="index" id="model-index">0${selected + 1} / 03</div></div><div class="swipe-hint">左右滑动，选择泥塑</div><button class="pill-btn home-cta" id="explore">探索制作 ${icon("arrow")}</button>`;
  }
  function craft() {
    const s = stages[phase];
    return `${subtop(products[id].name, "home", `<button class="icon-btn" id="sound" aria-label="${sound ? "关闭工序朗读" : "开启工序朗读"}">${icon(sound ? "sound" : "mute")}</button>`)}<div class="craft-heading"><h1 id="stage-name">${s.name}</h1><p id="stage-title">${s.title}</p></div><div class="craft-view"><div class="model-canvas" id="model"></div><div class="step-rail" aria-label="制作工序">${stages.map((s, i) => `<button data-stage="${i}" class="${i === phase ? "active" : ""}" aria-label="第${i + 1}步 ${s.name}"><span class="step-dot">${i + 1}</span>${s.name}</button>`).join("")}</div><div class="model-tools"><button id="zoom-out" aria-label="缩小模型">−</button><button id="zoom-in" aria-label="放大模型">+</button><button id="reset-view" aria-label="重置视角">${icon("rotate")}</button></div></div><div class="gesture-hint">拖动旋转 · 双指缩放 <span id="render-mode"></span></div><div class="craft-caption"><div class="number" id="stage-number">0${phase + 1} / 06</div><p id="stage-copy">${s.copy}</p></div><div class="filmstrip">${stages.map((s, i) => `<button data-stage="${i}" class="frame-thumb ${i === phase ? "active" : ""}" aria-label="查看${s.name}"><img src="${poster(id, i)}" alt="${s.name}阶段" loading="lazy"><small>${s.name}</small></button>`).join("")}</div><div class="player"><button id="play" aria-label="播放制作动画">${icon("play")}</button><input id="timeline" type="range" min="0" max="100" step="0.1" value="${progress * 20}" aria-label="制作进度"><span class="duration" id="duration">${Math.round(progress * 4)} / 20 秒</span></div><button class="pill-btn solid next-step" id="next-stage">${phase === 5 ? "欣赏成品" : "下一步 · " + stages[phase + 1].name} ${icon("arrow")}</button>`;
  }
  function people() {
    const show = products
      .map((p, i) => ({ p, i }))
      .filter(
        ({ i }) =>
          personFilter === "全部" ||
          (personFilter === "老匠人" ? i < 2 : i === 2),
      );
    return `<header class="top"><h1>守艺人</h1><button class="icon-btn" id="people-info" aria-label="名录说明">${icon("info")}</button></header><p class="lead">手艺的背后，是一生的热爱</p><div class="filters">${["全部", "老匠人", "新传承"].map((t) => `<button class="filter ${personFilter === t ? "active" : ""}" data-person-filter="${t}">${t}</button>`).join("")}</div><div class="people-list">${show.map(({ p, i }) => `<button class="person-row" data-go="person/${i}"><div class="artisan-photo ref-photo ${["a", "b", "c"][i]}" role="img" aria-label="设计稿中的示例手艺人照片"></div><div class="info"><h3>${p.maker}</h3><p>泥塑手艺人 · 资料待完善</p><span class="tag">${["塑形", "彩绘", "创新"][i]}</span><div class="quote">“ ${["把手艺，留在日常里。", "让老手艺，在新一代手里继续。", "从泥土里，找到新的可能。"][i]} ”</div></div>${icon("next")}</button>`).join("")}</div><p class="build-note">人物档案为设计示例<br>真实完整名录将在确定非遗项目后录入</p>`;
  }
  function person() {
    return `${subtop("人物档案", "people")}<div class="person-banner"><div class="wide-ref" role="img" aria-label="手艺人塑形的设计示意"></div></div><div class="person-name"><h1>${products[id].maker}</h1><span class="tag">示例档案</span></div><p class="lead">一双手，一辈子的泥土情</p><div class="tabs"><button class="active" id="story-tab">人物故事</button><button id="works-tab">代表作品</button></div><div class="biography" id="bio">从一捧泥开始，记录手艺的温度。<br>真实经历与师承资料待补充。<br><span class="subtitle">所属项目、从艺经历与传承身份均待核实。</span></div><section id="works"><div class="section-head"><h2>代表作品</h2><button class="text-link" data-go="shop">查看全部作品 ${icon("arrow")}</button></div><div class="product-grid">${[id, (id + 1) % 3].map((i) => productCard(i)).join("")}</div></section><button class="pill-btn full" data-explore="${id}" style="margin-top:24px">${icon("play")}观看制作过程</button>`;
  }
  function productCard(i) {
    const p = products[i];
    return `<button class="product-card" data-go="product/${i}"><img src="${poster(i)}" alt="${p.name}" loading="lazy"><h3>${p.name}</h3><div class="price">¥ ${p.price}</div></button>`;
  }
  function shop() {
    const items = products
      .map((p, i) => ({ p, i }))
      .filter(
        ({ p }) =>
          (filter === "全部" || p.category === filter) &&
          p.name.includes(search),
      );
    return `<header class="top"><h1 style="color:var(--red)">泥塑好物</h1><div class="top-actions"><button class="icon-btn" id="toggle-search" aria-label="搜索作品">${icon("search")}</button>${cartButton()}</div></header><p class="lead">把乡土的温度，带回家</p><div class="filters">${["全部", "瑞兽", "花鸟"].map((t) => `<button class="filter ${filter === t ? "active" : ""}" data-filter="${t}">${t}</button>`).join("")}</div><input class="search-input" id="search" placeholder="寻找心仪的泥塑" aria-label="搜索泥塑" value="${escape(search)}" ${search ? "" : "hidden"}><div id="product-results"><div class="product-grid">${items.map(({ i }) => productCard(i)).join("")}</div>${items.length ? "" : empty("没有找到这件泥塑", "试试搜索“泥虎”或“玉兔”。")}</div><p class="shop-note">作品与价格为设计示例</p>`;
  }
  function product() {
    const p = products[id];
    return `${subtop("作品详情", "shop", cartButton())}<div class="product-hero"><div class="model-canvas" id="model"></div></div><div class="photo-counter"><span id="view-label">3D / 360°</span></div><div class="thumb-row">${[
      [0, "正面"],
      [6, "侧面"],
      [12, "背面"],
    ]
      .map(
        ([v, l]) =>
          `<button data-photo="${v}" class="${photo === v ? "active" : ""}" aria-label="查看${l}"><img src="${poster(id, 5, v)}" alt="${l}"><small>${l}</small></button>`,
      )
      .join(
        "",
      )}</div><div class="product-title"><h1>${p.name}</h1><span class="tag">示例</span></div><div class="detail-price">¥ ${p.price}</div><dl class="details"><dt>制作人</dt><dd><button data-go="person/${id}">${p.maker}　›</button></dd><dt>制作日期</dt><dd>2026.10.01（示例）</dd><dt>工艺</dt><dd>手工塑形 · 彩绘</dd><dt>尺寸</dt><dd>${p.size}</dd></dl><p class="detail-story">${p.desc.replace("\n", "<br>")}</p><div class="balance"><span class="qty-label">数量</span>${quantity(qty, "product")}</div><button class="text-link" data-explore="${id}">看一件泥塑的诞生 ${icon("arrow")}</button><p class="note">手工模型为依设计稿重建的三维示意。当前交易为演示，不会扣款或发货。</p>`;
  }
  function buyBar() {
    return `<div class="purchase-bar"><button class="favorite ${favs.includes(id) ? "chosen" : ""}" id="favorite" aria-label="${favs.includes(id) ? "取消收藏" : "收藏作品"}">${icon("heart")}</button><button class="pill-btn" id="add-cart">加入购物车</button><button class="pill-btn solid" id="buy-now">立即购买</button></div>`;
  }
  function me() {
    return `<header class="subtop"><span style="width:25px"></span><span class="center">我的</span><button class="icon-btn" data-go="settings" aria-label="设置">${icon("settings")}</button></header><div class="profile"><div class="avatar">泥</div><div><h2>泥土收藏家</h2><p>收藏手艺，也收藏生活</p></div></div><div class="stats"><button data-go="favorites"><strong>${favs.length}</strong>收藏</button><button data-orders="全部"><strong>${orders.length}</strong>订单</button><button data-go="addresses"><strong>${addresses.length}</strong>地址</button></div><div class="section-head"><h2>我的订单</h2><button class="text-link" data-orders="全部">全部 ${icon("arrow")}</button></div><div class="order-icons">${[
      ["待付款", "wallet"],
      ["待发货", "box"],
      ["待收货", "truck"],
      ["已完成", "check"],
    ]
      .map(([s, i]) => `<button data-orders="${s}">${icon(i)}${s}</button>`)
      .join(
        "",
      )}</div>${orders.length ? `<div class="mini-order"><img src="${poster(orders[0].items[0].id)}" alt="最新订单作品"><div><h3>${products[orders[0].items[0].id].name}</h3><p>${orders[0].status} · 示例订单</p></div><button class="pill-btn" data-orders="全部">查看订单</button></div>` : ""}<div class="menu">${[
      ["favorites", "heart", "我的收藏"],
      ["cart", "cart", "购物车"],
      ["addresses", "pin", "收货地址"],
    ]
      .map(
        ([r, i, t]) =>
          `<button data-go="${r}"><span>${icon(i)}${t}</span>${icon("next")}</button>`,
      )
      .join(
        "",
      )}<button id="about"><span>${icon("info")}关于泥途</span>${icon("next")}</button></div><p class="my-note">让每一份喜欢，连接乡土生活。</p>`;
  }
  function quantity(n, prefix) {
    return `<div class="qty"><button data-minus="${prefix}" aria-label="减少数量">−</button><span>${n}</span><button data-plus="${prefix}" aria-label="增加数量">+</button></div>`;
  }
  function empty(title, copy, button = "") {
    return `<div class="empty">${icon("leaf")}<h2>${title}</h2><p>${copy}</p>${button}</div>`;
  }
  function cartRow(x, control = false) {
    return `<div class="cart-line"><button data-go="product/${x.id}" aria-label="查看${products[x.id].name}"><img src="${poster(x.id)}" alt="${products[x.id].name}"></button><div class="cart-info"><h3>${products[x.id].name}</h3><div class="price">¥ ${products[x.id].price}</div>${control ? quantity(x.qty, String(x.id)) + `<button class="remove" data-remove="${x.id}">移除</button>` : `<p class="subtitle" style="margin-top:10px">数量 × ${x.qty}</p>`}</div></div>`;
  }
  function cartPage() {
    return `${subtop("购物车", "me")}${cart.length ? cart.map((x) => cartRow(x, true)).join("") + `<p class="note">共 ${count()} 件心意。此处为体验结算，不会真实扣款。</p>` : empty("还没有装进心意", "去看看那些有温度的小物件吧。", '<button class="pill-btn" data-go="shop">逛逛泥塑好物 →</button>')}`;
  }
  function addressForm(
    a = { name: "", phone: "", region: "", address: "", default: false },
    index = -1,
  ) {
    return `<form id="address-form" data-index="${index}"><h2 class="form-title">${index === -1 ? "新增地址" : "编辑地址"}</h2><label class="field"><span>收货人</span><input name="name" aria-label="收货人" required maxlength="30" value="${escape(a.name)}" placeholder="请输入姓名" autocomplete="name"></label><label class="field"><span>联系电话</span><input name="phone" aria-label="联系电话" required pattern="[+0-9 ()-]{6,20}" value="${escape(a.phone)}" placeholder="请输入手机号" inputmode="tel" autocomplete="tel"></label><label class="field"><span>所在地区</span><input name="region" aria-label="所在地区" required value="${escape(a.region || "")}" placeholder="省 / 市 / 区" autocomplete="address-level1"></label><label class="field"><span>详细地址</span><textarea name="address" aria-label="详细地址" minlength="5" required placeholder="街道、门牌号等" autocomplete="street-address">${escape(a.address)}</textarea></label><label class="switch-row">设为默认地址<input class="switch" aria-label="设为默认地址" name="default" type="checkbox" ${a.default ? "checked" : ""}></label><button class="pill-btn solid full" type="submit">保存地址</button><p class="form-footer">体验版本，建议使用测试信息</p></form>`;
  }
  function addressesPage() {
    return `${subtop("收货地址", "me")}${addresses.map((a, i) => `<article class="address"><h3>${escape(a.name)}</h3><div class="phone-number">${escape(a.phone)}</div>${a.default ? '<span class="default-badge">默认</span>' : ""}<p>${escape(a.region || "")}<br>${escape(a.address)}</p><button class="edit" data-edit-address="${i}" aria-label="编辑${escape(a.name)}的地址">${icon("edit")}</button></article>`).join("")}${addressForm()}`;
  }
  function orderPage() {
    const arr = orders.filter(
      (o) => orderFilter === "全部" || o.status === orderFilter,
    );
    return `${subtop("我的订单", "me")}<div class="order-tabs">${["全部", "待付款", "待发货", "待收货", "已完成"].map((s) => `<button data-order-filter="${s}" class="${s === orderFilter ? "active" : ""}">${s}</button>`).join("")}</div>${arr.length ? arr.map((o) => `<article class="order-card"><div class="order-top"><span>${o.id}</span><b>${o.status} · 模拟</b></div>${o.items.map((x) => cartRow(x)).join("")}<div class="order-foot"><span>合计 ¥ ${total(o.items)}</span>${o.status === "待付款" ? `<button class="pill-btn" data-pay="${o.id}">模拟支付</button>` : `<span class="subtitle">演示订单不发货</span>`}</div></article>`).join("") : empty("还没有" + (orderFilter === "全部" ? "" : orderFilter) + "订单", "喜欢的手艺，值得慢慢挑选。", '<button class="pill-btn" data-go="shop">发现好物 →</button>')}`;
  }
  function favorites() {
    return `${subtop("我的收藏", "me")}${favs.length ? `<div class="product-grid" style="margin-top:20px">${favs.map((i) => productCard(i)).join("")}</div>` : empty("还没有收藏", "在作品详情页点亮爱心，留住你的喜欢。", '<button class="pill-btn" data-go="shop">发现一份喜欢 →</button>')}`;
  }
  function settings() {
    return `${subtop("设置", "me")}<div class="install-card"><h3>把泥途放在主屏幕</h3><p>用手机浏览器打开，通过浏览器菜单选择“添加到主屏幕”，即可用独立的竖屏窗口体验。</p><button class="pill-btn full" id="install" style="margin-top:18px">添加到主屏幕</button></div><div class="install-card"><h3>三维体验</h3><p>${supported() ? "此设备支持实时三维。制作过程可连续播放，模型可自由旋转和缩放。" : "当前浏览器未启用 WebGL，使用同一三维模型渲染的 360° 转台与分阶段预览。支持 WebGL 的手机可体验连续三维变化。"}</p></div><div class="install-card"><h3>关于体验数据</h3><p>收藏、地址和模拟订单保存在当前浏览器。当前不提供真实支付或物流服务。</p></div>`;
  }
  return {
    status,
    nav,
    cartButton,
    subtop,
    home,
    craft,
    people,
    person,
    productCard,
    shop,
    product,
    buyBar,
    me,
    quantity,
    empty,
    cartRow,
    cartPage,
    addressForm,
    addressesPage,
    orderPage,
    favorites,
    settings,
  };
}
