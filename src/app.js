import { mountSculpture, poster, supported } from "./rendering/clay.js";
import { products, stages } from "./data/catalog.js";
import { $, $$, escape } from "./core/dom.js";
import { read, save } from "./core/storage.js";
import { resolveRoute } from "./core/router.js";
import { icon } from "./ui/icons.js";
import { createViews } from "./ui/views.js";

// 视图按需读取当前状态，避免事件回调持有过期快照。
function views() {
  return createViews({
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
  });
}
const status = (...args) => views().status(...args);
const nav = (...args) => views().nav(...args);
const cartButton = (...args) => views().cartButton(...args);
const subtop = (...args) => views().subtop(...args);
const home = (...args) => views().home(...args);
const craft = (...args) => views().craft(...args);
const people = (...args) => views().people(...args);
const person = (...args) => views().person(...args);
const productCard = (...args) => views().productCard(...args);
const shop = (...args) => views().shop(...args);
const product = (...args) => views().product(...args);
const buyBar = (...args) => views().buyBar(...args);
const me = (...args) => views().me(...args);
const quantity = (...args) => views().quantity(...args);
const empty = (...args) => views().empty(...args);
const cartRow = (...args) => views().cartRow(...args);
const cartPage = (...args) => views().cartPage(...args);
const addressForm = (...args) => views().addressForm(...args);
const addressesPage = (...args) => views().addressesPage(...args);
const orderPage = (...args) => views().orderPage(...args);
const favorites = (...args) => views().favorites(...args);
const settings = (...args) => views().settings(...args);
let cart = read("cart", []),
  addresses = read("addresses", []),
  orders = read("orders", []),
  favs = read("favorites", []);
let selected = 0,
  route = "",
  id = 0,
  scene,
  phase = 0,
  progress = 0,
  playing = false,
  playFrame,
  sound = false,
  filter = "全部",
  personFilter = "全部",
  search = "",
  orderFilter = "全部",
  qty = 1,
  photo = 0,
  modalFocus,
  installEvent;
const count = () => cart.reduce((s, x) => s + x.qty, 0),
  total = (xs) => xs.reduce((s, x) => s + products[x.id].price * x.qty, 0);
function toast(t) {
  $("#toast").textContent = t;
  $("#toast").classList.add("show");
  clearTimeout(window.ntToast);
  window.ntToast = setTimeout(() => $("#toast").classList.remove("show"), 2600);
}
function go(path) {
  closeSheet();
  if (location.hash === "#/" + path) {
    parseRoute();
    render();
  } else location.hash = "/" + path;
}
function parseRoute() {
  ({ route, id } = resolveRoute(location.hash, products.length));
}
function render() {
  stopPlay();
  scene?.destroy();
  scene = null;
  const navRoutes = ["home", "people", "shop", "me"];
  const hasnav = navRoutes.includes(route);
  const f = {
    home,
    craft,
    people,
    person,
    shop,
    product,
    me,
    cart: cartPage,
    addresses: addressesPage,
    orders: orderPage,
    favorites,
    settings,
  };
  $("#app").innerHTML =
    `<div class="phone">${status()}<main class="screen fade-in ${hasnav ? "hasnav" : ""} ${route === "craft" ? "craft-screen" : ""} ${route === "home" ? "home-screen" : ""} ${route === "product" ? "detail-screen" : ""}" id="screen">${f[route]()}</main>${hasnav ? nav() : ""}${route === "product" ? buyBar() : ""}${route === "cart" && cart.length ? `<div class="checkout-bar"><div><small class="subtitle">合计</small> <span class="price">¥ ${total(cart)}</span></div><button class="pill-btn solid" id="checkout">去结算 ${icon("arrow")}</button></div>` : ""}<div class="home-indicator"></div></div>`;
  bind();
  if (["home", "craft", "product"].includes(route)) {
    scene = mountSculpture($("#model"), {
      kind: route === "home" ? selected : id,
      phase: route === "craft" ? progress : 5,
      interactive: route !== "home",
      onMode: (m) => {
        if ($("#render-mode"))
          $("#render-mode").textContent =
            m === "webgl" ? " · 实时 3D" : " · 360° 兼容预览";
      },
    });
    if (route === "home") {
      let sx, sy;
      const target = $(".home-scene");
      target.addEventListener(
        "touchstart",
        (e) => {
          sx = e.touches[0].clientX;
          sy = e.touches[0].clientY;
        },
        { passive: true },
      );
      target.addEventListener(
        "touchend",
        (e) => {
          const dx = e.changedTouches[0].clientX - sx,
            dy = e.changedTouches[0].clientY - sy;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy))
            choose(dx < 0 ? 1 : -1);
        },
        { passive: true },
      );
    }
  }
}
function bindNav(root = document) {
  root.querySelectorAll("[data-go]").forEach(
    (e) =>
      (e.onclick = () => {
        if (e.dataset.go.startsWith("product/")) {
          qty = 1;
          photo = 0;
        }
        go(e.dataset.go);
      }),
  );
  root
    .querySelectorAll("[data-explore]")
    .forEach((e) => (e.onclick = () => explore(+e.dataset.explore)));
}
function on(id, fn, event = "click") {
  document.getElementById(id)?.addEventListener(event, fn);
}
function bind() {
  bindNav();
  on("next-model", () => choose(1));
  on("prev-model", () => choose(-1));
  on("explore", () => explore(selected));
  on("about", about);
  on("people-info", () =>
    sheet(
      "传承人名录说明",
      "<p>当前为设计示例档案。待确定泥塑非遗的具体项目与地区后，录入经核实的传承人完整名单、师承经历、代表作品和资料来源。</p>",
    ),
  );
  $$("[data-stage]").forEach(
    (e) =>
      (e.onclick = () => {
        stopPlay();
        setProgress(+e.dataset.stage, true);
      }),
  );
  on("play", togglePlay);
  on(
    "timeline",
    () => {
      stopPlay();
      setProgress(+$("#timeline").value / 20);
    },
    "input",
  );
  on("next-stage", () => {
    if (phase === 5) {
      qty = 1;
      go("product/" + id);
    } else {
      stopPlay();
      setProgress(phase + 1, true);
    }
  });
  on("reset-view", () => scene?.reset());
  on("zoom-in", () => scene?.zoom(0.1));
  on("zoom-out", () => scene?.zoom(-0.1));
  on("sound", () => {
    sound = !sound;
    $("#sound").innerHTML = icon(sound ? "sound" : "mute");
    $("#sound").setAttribute(
      "aria-label",
      sound ? "关闭工序朗读" : "开启工序朗读",
    );
    if (sound) speak();
    else window.speechSynthesis?.cancel();
  });
  $$("[data-filter]").forEach(
    (e) =>
      (e.onclick = () => {
        filter = e.dataset.filter;
        render();
      }),
  );
  $$("[data-person-filter]").forEach(
    (e) =>
      (e.onclick = () => {
        personFilter = e.dataset.personFilter;
        render();
      }),
  );
  on("toggle-search", () => {
    $("#search").hidden = !$("#search").hidden;
    if (!$("#search").hidden) $("#search").focus();
  });
  on(
    "search",
    () => {
      search = $("#search").value;
      const arr = products
        .map((p, i) => ({ p, i }))
        .filter(
          ({ p }) =>
            (filter === "全部" || p.category === filter) &&
            p.name.includes(search),
        );
      $("#product-results").innerHTML = arr.length
        ? `<div class="product-grid">${arr.map(({ i }) => productCard(i)).join("")}</div>`
        : empty("没有找到这件泥塑", "换一个关键词试试。");
      bindNav($("#product-results"));
    },
    "input",
  );
  on("works-tab", () => {
    $("#bio").hidden = true;
    $("#works-tab").classList.add("active");
    $("#story-tab").classList.remove("active");
  });
  on("story-tab", () => {
    $("#bio").hidden = false;
    $("#story-tab").classList.add("active");
    $("#works-tab").classList.remove("active");
  });
  $$("[data-photo]").forEach(
    (e) =>
      (e.onclick = () => {
        photo = +e.dataset.photo;
        scene?.destroy();
        scene = null;
        $("#model").innerHTML =
          `<img class="model-poster" src="${poster(id, 5, photo)}" alt="${products[id].name}多角度展示">`;
        $("#view-label").innerHTML =
          `${["正面", "侧面", "背面"][photo / 6] || "多角度"} · <button id="return3d" class="text-link" style="display:inline">返回 3D</button>`;
        $$("[data-photo]").forEach((b) =>
          b.classList.toggle("active", b === e),
        );
        on("return3d", () => {
          scene = mountSculpture($("#model"), { kind: id, phase: 5 });
          $("#view-label").textContent = "3D / 360°";
        });
      }),
  );
  on("favorite", () => {
    favs = favs.includes(id) ? favs.filter((i) => i !== id) : [...favs, id];
    save("favorites", favs);
    $("#favorite").classList.toggle("chosen", favs.includes(id));
    $("#favorite").setAttribute(
      "aria-label",
      favs.includes(id) ? "取消收藏" : "收藏作品",
    );
    toast(favs.includes(id) ? "已收藏这份心意" : "已取消收藏");
  });
  on("add-cart", () => {
    const ex = cart.find((x) => x.id === id);
    if (ex) ex.qty = Math.min(99, ex.qty + qty);
    else cart.push({ id, qty });
    save("cart", cart);
    toast("已加入购物车");
    const btn = $('[aria-label="购物车"]');
    if (btn)
      btn.innerHTML = icon("shop") + `<span class="counter">${count()}</span>`;
  });
  on("buy-now", () => checkout([{ id, qty }], false));
  on("checkout", () =>
    checkout(
      cart.map((x) => ({ ...x })),
      true,
    ),
  );
  for (const [attr, d] of [
    ["minus", -1],
    ["plus", 1],
  ])
    $$(`[data-${attr}]`).forEach(
      (e) =>
        (e.onclick = () => {
          const key = e.dataset[attr];
          if (key === "product") {
            qty = Math.min(99, Math.max(1, qty + d));
            e.parentElement.querySelector("span").textContent = qty;
          } else {
            const x = cart.find((x) => x.id === +key);
            x.qty = Math.min(99, Math.max(1, x.qty + d));
            save("cart", cart);
            render();
          }
        }),
    );
  $$("[data-remove]").forEach(
    (e) =>
      (e.onclick = () => {
        cart = cart.filter((x) => x.id !== +e.dataset.remove);
        save("cart", cart);
        render();
      }),
  );
  $$("[data-orders]").forEach(
    (e) =>
      (e.onclick = () => {
        orderFilter = e.dataset.orders;
        go("orders");
      }),
  );
  $$("[data-order-filter]").forEach(
    (e) =>
      (e.onclick = () => {
        orderFilter = e.dataset.orderFilter;
        render();
      }),
  );
  $$("[data-pay]").forEach((e) => (e.onclick = () => pay(e.dataset.pay)));
  bindAddress();
  $$("[data-edit-address]").forEach(
    (e) => (e.onclick = () => editAddress(+e.dataset.editAddress)),
  );
  on("install", async () => {
    if (installEvent) {
      await installEvent.prompt();
      installEvent = null;
    } else
      sheet(
        "添加到主屏幕",
        "<p>iPhone：使用 Safari 打开，点“分享”→“添加到主屏幕”。</p><p>Android：使用浏览器菜单中的“安装应用”或“添加到主屏幕”。</p><p>这是可独立窗口运行的手机 Web App，不是应用商店安装包。</p>",
      );
  });
}
function choose(d) {
  selected = (selected + d + 3) % 3;
  scene?.setKind(selected, 5);
  $("#model-title").textContent = products[selected].name;
  $("#model-index").textContent = `0${selected + 1} / 03`;
}
function explore(i) {
  phase = 0;
  progress = 0;
  go("craft/" + i);
}
function setProgress(v, read = false) {
  progress = Math.max(0, Math.min(5, v));
  const newPhase = Math.min(5, Math.round(progress)),
    changed = newPhase !== phase;
  phase = newPhase;
  scene?.setPhase(progress);
  if ($("#stage-name")) {
    $("#stage-name").textContent = stages[phase].name;
    $("#stage-title").textContent = stages[phase].title;
    $("#stage-copy").textContent = stages[phase].copy;
    $("#stage-number").textContent = `0${phase + 1} / 06`;
    $("#timeline").value = progress * 20;
    $("#duration").textContent = `${Math.round(progress * 4)} / 20 秒`;
    $("#next-stage").innerHTML =
      (phase === 5 ? "欣赏成品" : "下一步 · " + stages[phase + 1].name) +
      " " +
      icon("arrow");
    $$("[data-stage]").forEach((e) =>
      e.classList.toggle("active", +e.dataset.stage === phase),
    );
  }
  if (sound && (changed || read)) speak();
}
function stopPlay() {
  playing = false;
  cancelAnimationFrame(playFrame);
  if ($("#play")) {
    $("#play").innerHTML = icon("play");
    $("#play").setAttribute("aria-label", "播放制作动画");
  }
}
function togglePlay() {
  if (playing) {
    stopPlay();
    return;
  }
  if (progress >= 4.99) setProgress(0);
  playing = true;
  $("#play").innerHTML = icon("pause");
  $("#play").setAttribute("aria-label", "暂停制作动画");
  const start = performance.now(),
    base = progress;
  const tick = (t) => {
    if (!playing || route !== "craft") return;
    const p = Math.min(5, base + (t - start) / 4000);
    setProgress(p);
    if (p === 5) {
      stopPlay();
      return;
    }
    playFrame = requestAnimationFrame(tick);
  };
  playFrame = requestAnimationFrame(tick);
  if (sound) speak();
}
function speak() {
  if (!("speechSynthesis" in window)) {
    toast("当前浏览器不支持朗读");
    sound = false;
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(
    stages[phase].name + "。" + stages[phase].copy,
  );
  u.lang = "zh-CN";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}
function sheet(title, body) {
  modalFocus = document.activeElement;
  $("#modal").innerHTML =
    `<div class="overlay"><section class="sheet" role="dialog" aria-modal="true" aria-label="${title}"><div class="sheet-head"><h2>${title}</h2><button class="icon-btn" id="close-sheet" aria-label="关闭">${icon("close")}</button></div>${body}</section></div>`;
  on("close-sheet", closeSheet);
  $(".overlay").onclick = (e) => {
    if (e.target.classList.contains("overlay")) closeSheet();
  };
  $("#close-sheet").focus();
}
function closeSheet() {
  $("#modal").innerHTML = "";
  modalFocus?.focus();
}
function about() {
  sheet(
    "泥途 · 掌心里的泥塑",
    "<p>一捧泥土，一份乡情。以数字方式走近泥塑的制作，也走近手艺背后的乡村生活。</p><p>当前模型依界面设计稿重建，采用连续三维网格、民俗彩绘与颗粒材质。工序为通用示意，正式内容应以选定非遗项目的真实技法为准。</p><p>人物、作品价格与订单均为示例。此版本不提供真实交易。</p>",
  );
}
function bindAddress(after) {
  const form = $("#address-form");
  if (!form) return;
  form.onsubmit = (e) => {
    e.preventDefault();
    const fd = new FormData(form),
      a = {
        name: fd.get("name").trim(),
        phone: fd.get("phone").trim(),
        region: fd.get("region").trim(),
        address: fd.get("address").trim(),
        default: fd.get("default") === "on",
      };
    if (!a.name || !a.region || a.address.length < 5) {
      toast("请填写完整地址");
      return;
    }
    if (!addresses.length) a.default = true;
    if (a.default) addresses.forEach((x) => (x.default = false));
    const i = +form.dataset.index;
    if (i < 0) addresses.push(a);
    else addresses[i] = a;
    save("addresses", addresses);
    closeSheet();
    if (after) after();
    else render();
    toast("地址已保存");
  };
}
function editAddress(i) {
  sheet(
    "编辑收货地址",
    addressForm(addresses[i], i) +
      `<button class="text-link" id="delete-address" style="margin:20px auto 0">删除这个地址</button>`,
  );
  bindAddress();
  on("delete-address", () => {
    sheet(
      "删除地址",
      '<p>确认移除这条收货地址？</p><button class="pill-btn solid full" id="confirm-delete">确认删除</button>',
    );
    on("confirm-delete", () => {
      addresses.splice(i, 1);
      if (addresses.length && !addresses.some((a) => a.default))
        addresses[0].default = true;
      save("addresses", addresses);
      closeSheet();
      render();
    });
  });
}
function checkout(items, fromCart) {
  if (!addresses.length) {
    sheet("先为心意留一个地址", addressForm());
    bindAddress(() => checkout(items, fromCart));
    return;
  }
  sheet(
    "确认订单",
    `<p>体验结算 · 不会真实扣款</p><select id="select-address" aria-label="选择收货地址">${addresses.map((a, i) => `<option value="${i}" ${a.default ? "selected" : ""}>${escape(a.name)} · ${escape(a.region)} ${escape(a.address)}</option>`).join("")}</select>${items.map((x) => cartRow(x)).join("")}<div class="total"><span>合计</span><b>¥ ${total(items)}</b></div><button class="pill-btn solid full" id="submit-order">提交模拟订单</button>`,
  );
  on("submit-order", () => {
    orders.unshift({
      id: "NT" + Date.now().toString().slice(-10),
      date: new Date().toISOString(),
      status: "待付款",
      items: items.map((x) => ({ ...x })),
      address: { ...addresses[+$("#select-address").value] },
    });
    save("orders", orders);
    if (fromCart) {
      cart = [];
      save("cart", cart);
    }
    orderFilter = "全部";
    go("orders");
    toast("模拟订单已创建，未扣款");
  });
}
function pay(orderId) {
  sheet(
    "模拟支付",
    '<p>仅演示订单的支付状态，不收取费用，也不会发货。</p><button class="pill-btn solid full" id="confirm-pay">确认模拟支付</button>',
  );
  on("confirm-pay", () => {
    orders.find((o) => o.id === orderId).status = "待发货";
    save("orders", orders);
    closeSheet();
    render();
    toast("模拟支付完成");
  });
}
window.addEventListener("hashchange", () => {
  window.speechSynthesis?.cancel();
  parseRoute();
  render();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSheet();
  if (e.key === "Tab" && $(".sheet")) {
    const f = $$(
      ".sheet button,.sheet input,.sheet select,.sheet textarea",
    ).filter((e) => !e.disabled);
    if (e.shiftKey && document.activeElement === f[0]) {
      e.preventDefault();
      f.at(-1)?.focus();
    } else if (!e.shiftKey && document.activeElement === f.at(-1)) {
      e.preventDefault();
      f[0]?.focus();
    }
  }
});
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
});
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
parseRoute();
render();
