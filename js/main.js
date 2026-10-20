/* ==========================================================================
   Nimbus — main.js
   无依赖。所有模块均在 DOM 就绪后初始化，任一块失败不影响其余功能。
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 工具 ---------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- 1. 导航：滚动加阴影 ---------- */
  function initNavShadow() {
    var nav = $('#nav');
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 8);
    };
    // passive 避免阻塞滚动
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 2. 移动端菜单 ---------- */
  function initMobileMenu() {
    var toggle = $('#navToggle');
    var links = $('#navLinks');
    if (!toggle || !links) return;

    var close = function () {
      links.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开菜单');
    };

    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', isOpen ? '关闭菜单' : '打开菜单');
    });

    // 点击菜单内链接后收起
    $$('a', links).forEach(function (a) {
      a.addEventListener('click', close);
    });

    // 点击外部收起
    document.addEventListener('click', function (e) {
      if (!links.classList.contains('is-open')) return;
      if (links.contains(e.target) || toggle.contains(e.target)) return;
      close();
    });

    // Esc 收起并把焦点还给按钮
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('is-open')) {
        close();
        toggle.focus();
      }
    });

    // 视口放大回桌面尺寸时重置状态
    window.addEventListener('resize', function () {
      if (window.innerWidth > 820) close();
    });
  }

  /* ---------- 3. 滚动入场 ---------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;

    // 不支持 IntersectionObserver 时直接全部显示
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // 一旦与视口有任何相交即显示（含短暂划过的情况），
        // 一次性动画 + unobserve，避免反复触发
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

    items.forEach(function (el) { io.observe(el); });

    // 兜底：滚动停顿后仍未显示的元素直接显示，
    // 防止键盘 End/程序化瞬时跳滚导致漏触发
    var flushTimer = null;
    window.addEventListener('scroll', function () {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(function () {
        flushTimer = null;
        items.forEach(function (el) {
          if (!el.classList.contains('is-in')) {
            var r = el.getBoundingClientRect();
            if (r.top < window.innerHeight && r.bottom > 0) {
              el.classList.add('is-in');
              io.unobserve(el);
            }
          }
        });
      }, 160);
    }, { passive: true });
  }

  /* ---------- 4. 代码示例 Tab ---------- */
  var SNIPPETS = {
    install: [
      '<span class="c-cm"># 全局安装 CLI</span>',
      '<span class="c-fn">npm</span> install -g <span class="c-st">@nimbus/cli</span>',
      '',
      '<span class="c-cm"># 登录并关联当前仓库</span>',
      '<span class="c-fn">nimbus</span> login',
      '<span class="c-fn">nimbus</span> link --project team-alpha'
    ],
    config: [
      '<span class="c-cm"># nimbus.config.yaml</span>',
      '<span class="c-ky">project</span>: <span class="c-st">team-alpha</span>',
      '<span class="c-ky">collect</span>:',
      '  <span class="c-ky">commits</span>: <span class="c-nm">true</span>',
      '  <span class="c-ky">ci_events</span>: <span class="c-nm">true</span>',
      '<span class="c-ky">integrations</span>:',
      '  - <span class="c-st">github</span>',
      '  - <span class="c-st">slack</span>',
      '  - <span class="c-st">jira</span>'
    ],
    query: [
      '<span class="c-cm">// 查询本周交付情况</span>',
      '<span class="c-ky">const</span> report = <span class="c-ky">await</span> nimbus.<span class="c-fn">report</span>({',
      '  <span class="c-ky">project</span>: <span class="c-st">"team-alpha"</span>,',
      '  <span class="c-ky">range</span>: <span class="c-st">"this-week"</span>',
      '});',
      '',
      'console.<span class="c-fn">log</span>(report.<span class="c-bs">shipped</span>); <span class="c-cm">// 24</span>'
    ]
  };

  function initCodeTabs() {
    var codeEl = $('#codeBlock');
    var tabs = $$('.tab');
    if (!codeEl || !tabs.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.dataset.tab;
        if (!SNIPPETS[key]) return;

        tabs.forEach(function (t) {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });

        // 轻微淡入，暗示内容已切换
        codeEl.style.opacity = '0';
        setTimeout(function () {
          codeEl.innerHTML = SNIPPETS[key].join('\n');
          codeEl.style.opacity = '1';
        }, 90);
      });
    });

    // 为切换添加过渡
    codeEl.style.transition = 'opacity .16s ease';
    codeEl.style.display = 'block';

    // 键盘左右切换
    tabs.forEach(function (tab, i) {
      tab.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var next = tabs[(i + dir + tabs.length) % tabs.length];
        next.focus();
        next.click();
      });
    });
  }

  /* ---------- 5. 复制代码 ---------- */
  function initCopy() {
    var btn = $('#copyBtn');
    var codeEl = $('#codeBlock');
    if (!btn || !codeEl) return;

    var label = $('span', btn);
    var originalText = label ? label.textContent : '复制';

    var reset = function () {
      btn.classList.remove('is-done');
      if (label) label.textContent = originalText;
    };

    btn.addEventListener('click', function () {
      var text = codeEl.textContent;

      // 优先用 Clipboard API，失败回退 execCommand
      var fallback = function () {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.setAttribute('readonly', '');
          ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          return true;
        } catch (err) {
          return false;
        }
      };

      var done = function (ok) {
        if (!ok) return;
        btn.classList.add('is-done');
        if (label) label.textContent = '已复制';
        setTimeout(reset, 1800);
      };

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
          .then(function () { done(true); })
          .catch(function () { done(fallback()); });
      } else {
        done(fallback());
      }
    });
  }

  /* ---------- 6. CTA 表单校验 ---------- */
  function initForm() {
    var form = $('#ctaForm');
    var msg = $('#ctaMsg');
    if (!form || !msg) return;

    var input = $('#email');
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = (input && input.value || '').trim();

      msg.classList.remove('is-error');

      if (!value) {
        msg.textContent = '请输入邮箱地址';
        msg.classList.add('is-error');
        if (input) input.focus();
        return;
      }
      if (!EMAIL_RE.test(value)) {
        msg.textContent = '邮箱格式好像不太对，请再检查一下';
        msg.classList.add('is-error');
        if (input) input.focus();
        return;
      }

      // 静态站点无后端：这里只是演示反馈，接入时替换为真实 API 调用
      msg.textContent = '收到！我们会向 ' + value + ' 发送后续步骤（演示站点，不会真的发信）。';
      form.reset();
    });

    // 输入时清除错误提示
    if (input) {
      input.addEventListener('input', function () {
        if (!msg.classList.contains('is-error')) return;
        msg.textContent = '';
        msg.classList.remove('is-error');
      });
    }
  }

  /* ---------- 7. 页脚年份 ---------- */
  function initYear() {
    var el = $('#year');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* ---------- 8. FAQ 手风琴（一次只开一个） ---------- */
  function initFaq() {
    var items = $$('.faq__item');
    if (!items.length) return;

    items.forEach(function (item) {
      item.addEventListener('toggle', function () {
        if (!item.open) return;
        items.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      });
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    // 每块独立 try 包裹，单点失败不拖垮整页
    [initNavShadow, initMobileMenu, initReveal, initCodeTabs,
     initCopy, initForm, initYear, initFaq].forEach(function (fn) {
      try { fn(); } catch (err) {
        if (window.console && console.warn) console.warn('[nimbus] init failed:', fn.name, err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
