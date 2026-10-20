/* ==========================================================================
   编辑器逻辑：数据绑定 / 条目管理 / 模板切换 / 自动保存 / 导出
   依赖 data.js、render.js
   ========================================================================== */
(function () {
  'use strict';

  var D = window.ResumeData;
  var R = window.ResumeRender;

  var state = D.Store.load();
  var saveTimer = null;
  var zoom = 1;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- 取值 / 赋值：支持 "a.b.c" 路径 ---------- */
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }
  function setPath(obj, path, val) {
    var keys = path.split('.');
    var last = keys.pop();
    var t = keys.reduce(function (o, k) {
      if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
      return o[k];
    }, obj);
    t[last] = val;
  }

  /* ---------- 渲染预览 ---------- */
  function renderPreview() {
    $('#resumeRoot').innerHTML = R.render(state);
  }

  /* ---------- 保存（防抖） ---------- */
  function scheduleSave() {
    var el = $('#saveState');
    el.textContent = '保存中…';
    el.className = 'save-state is-saving';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var ok = D.Store.save(state);
      el.textContent = ok ? '已自动保存' : '保存失败：存储空间可能已满';
      el.className = 'save-state' + (ok ? '' : ' is-err');
    }, 400);
  }

  /* ---------- 更新（统一入口） ---------- */
  function update() {
    renderPreview();
    scheduleSave();
  }

  /* ==========================================================
     1. 模板选择
     ========================================================== */
  function renderTemplates() {
    var grid = $('#tplGrid');
    grid.innerHTML = D.TEMPLATES.map(function (t) {
      var active = state.meta.template === t.id ? ' is-active' : '';
      return '<button type="button" class="tpl-card' + active + '" data-tpl="' + t.id + '" title="' + R.esc(t.desc) + '">' +
        '<span class="tpl-card__name">' + R.esc(t.name) + '</span>' +
        '<span class="tpl-card__tag">' + R.esc(t.tag) + '</span>' +
      '</button>';
    }).join('');

    $$('.tpl-card', grid).forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.meta.template = btn.dataset.tpl;
        $$('.tpl-card', grid).forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        update();
      });
    });
  }

  /* ==========================================================
     2. 基础字段绑定（profile / skills）
     ========================================================== */
  function bindFields() {
    $$('[data-bind]').forEach(function (input) {
      var path = input.dataset.bind;
      var v = getPath(state, path);
      input.value = v == null ? '' : v;

      var handler = function () {
        setPath(state, path, input.value);
        update();
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
    });
  }

  /* ==========================================================
     3. 条目列表（教育 / 实习 / 项目）
     ========================================================== */
  var LIST_CONF = {
    education: { key: 'education', tpl: 'tplEdu', host: 'eduList' },
    experience: { key: 'experience', tpl: 'tplExp', host: 'expList' },
    projects: { key: 'projects', tpl: 'tplProj', host: 'projList' }
  };

  function fieldInputs(itemEl) {
    return $$('[data-f]', itemEl);
  }

  /* 把数据写入 DOM */
  function fillItem(itemEl, data) {
    fieldInputs(itemEl).forEach(function (inp) {
      var f = inp.dataset.f;
      if (inp.type === 'checkbox') {
        inp.checked = data[f] !== false;
      } else {
        inp.value = data[f] == null ? '' : data[f];
      }
    });
  }

  /* 从 DOM 读回数据 */
  function readItem(itemEl, data) {
    fieldInputs(itemEl).forEach(function (inp) {
      var f = inp.dataset.f;
      data[f] = inp.type === 'checkbox' ? inp.checked : inp.value;
    });
    return data;
  }

  function renderList(kind) {
    var conf = LIST_CONF[kind];
    var host = $('#' + conf.host);
    var tpl = $('#' + conf.tpl);
    host.innerHTML = '';

    (state[conf.key] || []).forEach(function (data, idx) {
      var node = tpl.content.cloneNode(true);
      var itemEl = node.querySelector('.item');
      itemEl.dataset.id = data.id || D.uid();
      fillItem(itemEl, data);

      // 输入：同步到数据
      fieldInputs(itemEl).forEach(function (inp) {
        var ev = inp.tagName === 'SELECT' || inp.type === 'checkbox' ? 'change' : 'input';
        inp.addEventListener(ev, function () {
          var item = state[conf.key][idx];
          if (!item) return;
          readItem(itemEl, item);
          update();
          if (kind !== 'education') checkVague(itemEl, item);
        });
      });

      // 删除
      $('[data-del]', itemEl).addEventListener('click', function () {
        state[conf.key].splice(idx, 1);
        renderList(kind);
        update();
      });

      if (kind !== 'education') checkVague(itemEl, data);
      host.appendChild(node);
    });
  }

  /* 虚词/量化提示：按句分析，避免跨句误判；排除名词性用法 */
  function checkVague(itemEl, data) {
    var hint = $('[data-hint]', itemEl);
    if (!hint) return;
    var desc = (data.desc || '').trim();
    hint.style.color = '';
    if (!desc) {
      hint.textContent = '';
      hint.className = 'item__hint';
      return;
    }

    // 按行/句切分，逐句判断（一条经历里通常有一句写了数字就够）
    var sentences = desc.split(/[\n。；;]+/).map(function (t) { return t.trim(); }).filter(Boolean);
    var noNumberSentences = sentences.filter(function (t) { return !/\d/.test(t); });

    var msgs = [];

    // 只有「整条描述完全没有数字」才提示，避免局部句子误报
    if (noNumberSentences.length === sentences.length) {
      msgs.push('描述里还没有数字。补上规模、时长或提升幅度，说服力会强很多（例：覆盖 5000 名用户、效率提升 40%）。');
    }

    // 弱动词：仅在句首或顿号/逗号后出现时才判定为动词用法
    var weakHits = [];
    D.VAGUE_WORDS.forEach(function (w) {
      // 排除「负责人」「参与度」「协助方」等名词化组合
      var re = new RegExp('(^|[，,、\\s])' + w + '(?!人|者|度|方|性|的)');
      if (re.test(desc)) {
        var alt = (D.VERB_MAP[w] || []).slice(0, 2).join(' / ');
        weakHits.push('「' + w + '」→ ' + (alt || '换成更精确的动词'));
      }
    });
    if (weakHits.length) {
      msgs.push('检测到偏弱的动词：' + weakHits.slice(0, 2).join('；') + '。');
    }

    if (msgs.length) {
      hint.textContent = msgs.join(' ');
      hint.className = 'item__hint is-warn';
    } else {
      hint.textContent = '✓ 表达具体，含可验证的数据或结果。';
      hint.className = 'item__hint';
      hint.style.color = '#059669';
    }
  }

  /* 添加条目 */
  function addItem(kind) {
    var conf = LIST_CONF[kind];
    var blank = kind === 'education'
      ? { id: D.uid(), school: '', major: '', degree: '本科', start: '', end: '', gpa: '', detail: '' }
      : kind === 'experience'
        ? { id: D.uid(), company: '', role: '', start: '', end: '', desc: '', visible: true }
        : { id: D.uid(), name: '', role: '', start: '', end: '', desc: '', visible: true };
    state[conf.key].push(blank);
    renderList(kind);
    update();
    // 滚动到新增项
    var host = $('#' + conf.host);
    var last = host.lastElementChild;
    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ==========================================================
     4. 缩放
     ========================================================== */
  function applyZoom() {
    var wrap = $('#paperWrap');
    // 桌面端 100% 基准；小屏基准相应缩小
    var base = window.innerWidth <= 620 ? 0.62 : window.innerWidth <= 900 ? 0.86 : 1;
    var eff = base * zoom;
    wrap.style.transform = 'scale(' + eff + ')';
    $('#zoomLabel').textContent = Math.round(zoom * 100) + '%';
    // 缩放后腾出的空白需要补偿，否则会出现大片空白或滚动条错乱
    var pageH = wrap.offsetHeight || 1123;
    wrap.style.marginBottom = (eff < 1 ? -(pageH * (1 - eff)) : 0) + 'px';
  }

  /* ==========================================================
     5. 导出 PDF
     ========================================================== */
  function exportPDF() {
    // 直接调用浏览器打印（另存为 PDF），保持矢量清晰、无工具水印
    var beforeTitle = document.title;
    var name = (state.profile.name || '').trim();
    var target = (state.profile.title || '').trim();
    document.title = [name || '我的简历', target].filter(Boolean).join('-');
    window.print();
    // 打印对话框关闭后恢复标题
    setTimeout(function () { document.title = beforeTitle; }, 1000);
  }

  /* ==========================================================
     6. 示例数据 / 清空
     ========================================================== */
  function sampleResume() {
    var s = D.blankResume();
    s.profile = {
      name: '林小满',
      title: '前端开发工程师',
      phone: '138 0013 8000',
      email: 'linxiaoman@example.com',
      city: '杭州',
      link: 'github.com/linxiaoman',
      summary: '计算机科学与技术专业应届生，2 段前端实习经历，主导过 3 个上线项目。熟悉 React 生态与性能优化，习惯用数据衡量改进效果。'
    };
    s.education = [{
      id: D.uid(), school: '浙江理工大学', major: '计算机科学与技术', degree: '本科',
      start: '2021.09', end: '2025.06', gpa: '3.7/4.0（前 10%）',
      detail: '主修课程：数据结构、操作系统、计算机网络、数据库原理\n校级一等奖学金（2023）、ACM 校赛二等奖'
    }];
    s.experience = [{
      id: D.uid(), company: '杭州云舟网络科技有限公司', role: '前端开发实习生',
      start: '2024.03', end: '2024.09', visible: true,
      desc: '主导商品列表页性能优化，首屏加载从 3.2s 降至 1.1s，跳出率下降 18%\n搭建内部组件库，沉淀 20+ 通用组件，新页面开发效率提升约 40%\n牵头 12 次需求评审，独立交付 5 个功能模块（设计至上线）'
    }, {
      id: D.uid(), company: '校园信息中心', role: '前端开发（勤工助学）',
      start: '2023.03', end: '2023.12', visible: true,
      desc: '独立开发校园失物招领平台，累计发布信息 3000+ 条，促成 600 余件物品归还\n使用 Vue3 + Vite 重构旧系统，页面响应时间缩短 60%'
    }];
    s.projects = [{
      id: D.uid(), name: '校园二手交易小程序', role: '前端负责人',
      start: '2024.09', end: '2024.12', visible: true,
      desc: '面向校内 5000+ 学生的二手交易平台，任 4 人前端小组负责人\n使用 Taro + TypeScript 实现微信小程序与 H5 双端复用，代码复用率 85%\n上线 3 个月累计成交 1200 单，日活峰值 800+'
    }];
    s.skills = {
      tech: 'React、TypeScript、Vue3、Node.js、Webpack、Git、性能优化',
      soft: '技术文档写作、跨团队沟通、需求拆解',
      certs: 'CET-6（580）、软件设计师（中级）'
    };
    return s;
  }

  /* ==========================================================
     7. 初始化
     ========================================================== */
  function init() {
    renderTemplates();
    bindFields();
    ['education', 'experience', 'projects'].forEach(renderList);
    renderPreview();
    applyZoom();

    // 添加按钮
    $$('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addItem(btn.dataset.add);
      });
    });

    // 导出
    $('#btnExport').addEventListener('click', exportPDF);

    // 示例
    $('#btnSample').addEventListener('click', function () {
      if (!confirm('用示例内容覆盖当前填写？当前内容会被替换。')) return;
      state = sampleResume();
      renderTemplates();
      bindFields();
      ['education', 'experience', 'projects'].forEach(renderList);
      update();
    });

    // 清空
    $('#btnReset').addEventListener('click', function () {
      if (!confirm('确定清空所有内容？此操作不可撤销。')) return;
      state = D.blankResume();
      D.Store.clear();
      renderTemplates();
      bindFields();
      ['education', 'experience', 'projects'].forEach(renderList);
      update();
    });

    // 缩放
    $('#btnZoomIn').addEventListener('click', function () {
      zoom = Math.min(1.4, Math.round((zoom + 0.1) * 10) / 10);
      applyZoom();
    });
    $('#btnZoomOut').addEventListener('click', function () {
      zoom = Math.max(0.5, Math.round((zoom - 0.1) * 10) / 10);
      applyZoom();
    });
    window.addEventListener('resize', applyZoom);

    // 快捷键：Ctrl/Cmd + P 直接走打印
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        exportPDF();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
