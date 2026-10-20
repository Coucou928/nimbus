/* ==========================================================================
   渲染层：把 resume 数据渲染成 HTML（8 套模板共用同一套 DOM 结构）
   模板差异完全由 CSS 控制，保证切换模板时内容不丢失、无需重填
   ========================================================================== */
(function (global) {
  'use strict';

  /* HTML 转义，防止用户输入破坏结构（XSS 防护） */
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* 把自由文本按换行拆成段落，每行渲染为 <li> 或 <p> */
  function lines(text, cls) {
    if (!text) return '';
    var arr = String(text).split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean);
    if (!arr.length) return '';
    return arr.map(function (t) {
      return '<p class="' + (cls || 'r-line') + '">' + esc(t) + '</p>';
    }).join('');
  }

  /* 时间区间格式化：2023-09 -> 2023.09；空值按情况省略 */
  function period(start, end) {
    var s = (start || '').trim();
    var e = (end || '').trim();
    if (!s && !e) return '';
    if (!e) return s;
    if (!s) return e;
    return s + ' – ' + e;
  }

  /* 技能：支持中英文逗号、顿号、换行分隔 */
  function splitSkills(str) {
    if (!str) return [];
    return String(str).split(/[,，、\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function skillsHTML(str) {
    var arr = splitSkills(str);
    if (!arr.length) return '';
    return '<div class="r-skills">' + arr.map(function (s) {
      return '<span class="r-skill">' + esc(s) + '</span>';
    }).join('') + '</div>';
  }

  /* ---------- 各区块 ---------- */

  function profileHTML(p) {
    var contacts = [];
    if (p.phone) contacts.push('<span class="r-contact-item">' + esc(p.phone) + '</span>');
    if (p.email) contacts.push('<span class="r-contact-item">' + esc(p.email) + '</span>');
    if (p.city) contacts.push('<span class="r-contact-item">' + esc(p.city) + '</span>');
    if (p.link) contacts.push('<span class="r-contact-item">' + esc(p.link) + '</span>');

    return '' +
      '<header class="r-header">' +
        '<div class="r-header-main">' +
          '<h1 class="r-name">' + (esc(p.name) || '<span class="r-ph">你的姓名</span>') + '</h1>' +
          (p.title ? '<p class="r-title">' + esc(p.title) + '</p>' : '') +
        '</div>' +
        (contacts.length ? '<div class="r-contacts">' + contacts.join('') + '</div>' : '') +
      '</header>' +
      (p.summary ? '<section class="r-section r-section--summary"><p class="r-summary">' + esc(p.summary) + '</p></section>' : '');
  }

  function educationHTML(list) {
    var items = (list || []).filter(function (e) {
      return e.school || e.major || e.detail;
    });
    if (!items.length) return '';

    var body = items.map(function (e) {
      var sub = [e.major, e.degree].filter(Boolean).join(' · ');
      return '' +
        '<div class="r-item">' +
          '<div class="r-item-head">' +
            '<div class="r-item-left">' +
              '<span class="r-item-title">' + esc(e.school) + '</span>' +
              (sub ? '<span class="r-item-sub">' + esc(sub) + '</span>' : '') +
            '</div>' +
            '<div class="r-item-right">' +
              (e.gpa ? '<span class="r-gpa">GPA ' + esc(e.gpa) + '</span>' : '') +
              '<span class="r-period">' + esc(period(e.start, e.end)) + '</span>' +
            '</div>' +
          '</div>' +
          (e.detail ? lines(e.detail) : '') +
        '</div>';
    }).join('');

    return section('教育背景', body);
  }

  function experienceHTML(list) {
    var items = (list || []).filter(function (e) {
      return e.visible !== false && (e.company || e.role || e.desc);
    });
    if (!items.length) return '';

    var body = items.map(function (e) {
      return '' +
        '<div class="r-item">' +
          '<div class="r-item-head">' +
            '<div class="r-item-left">' +
              '<span class="r-item-title">' + esc(e.company) + '</span>' +
              (e.role ? '<span class="r-item-sub">' + esc(e.role) + '</span>' : '') +
            '</div>' +
            '<div class="r-item-right"><span class="r-period">' + esc(period(e.start, e.end)) + '</span></div>' +
          '</div>' +
          (e.desc ? lines(e.desc, 'r-line r-line--bullet') : '') +
        '</div>';
    }).join('');

    return section('实习与工作经历', body);
  }

  function projectsHTML(list) {
    var items = (list || []).filter(function (e) {
      return e.visible !== false && (e.name || e.role || e.desc);
    });
    if (!items.length) return '';

    var body = items.map(function (e) {
      return '' +
        '<div class="r-item">' +
          '<div class="r-item-head">' +
            '<div class="r-item-left">' +
              '<span class="r-item-title">' + esc(e.name) + '</span>' +
              (e.role ? '<span class="r-item-sub">' + esc(e.role) + '</span>' : '') +
            '</div>' +
            '<div class="r-item-right"><span class="r-period">' + esc(period(e.start, e.end)) + '</span></div>' +
          '</div>' +
          (e.desc ? lines(e.desc, 'r-line r-line--bullet') : '') +
        '</div>';
    }).join('');

    return section('项目经历', body);
  }

  function skillsSectionHTML(sk) {
    var blocks = [];
    if (sk.tech) {
      blocks.push('<div class="r-skill-block"><span class="r-skill-label">专业技能</span>' + skillsHTML(sk.tech) + '</div>');
    }
    if (sk.soft) {
      blocks.push('<div class="r-skill-block"><span class="r-skill-label">通用能力</span>' + skillsHTML(sk.soft) + '</div>');
    }
    if (sk.certs) {
      blocks.push('<div class="r-skill-block"><span class="r-skill-label">证书荣誉</span>' + skillsHTML(sk.certs) + '</div>');
    }
    if (!blocks.length) return '';
    return section('技能与证书', '<div class="r-skill-groups">' + blocks.join('') + '</div>');
  }

  function section(title, body) {
    return '' +
      '<section class="r-section">' +
        '<h2 class="r-section-title">' + esc(title) + '</h2>' +
        '<div class="r-section-body">' + body + '</div>' +
      '</section>';
  }

  /* ---------- 主渲染 ---------- */
  function render(resume) {
    var tpl = (resume.meta && resume.meta.template) || 'minimal';
    var mainParts = [
      experienceHTML(resume.experience),
      projectsHTML(resume.projects),
      educationHTML(resume.education)
    ].filter(Boolean);

    // 双栏 / 创意模板把技能放侧边栏，其余模板放正文
    var sideTemplates = ['two-col', 'creative', 'business'];
    var isSide = sideTemplates.indexOf(tpl) !== -1;

    var sideHTML = '';
    var extraMain = '';
    if (isSide) {
      sideHTML = '' +
        '<aside class="r-aside">' +
          (skillsSectionHTML(resume.skills) || '') +
          (educationHTML(resume.education) || '') +
        '</aside>';
      // 侧栏已含教育，正文不再重复
      extraMain = [
        experienceHTML(resume.experience),
        projectsHTML(resume.projects)
      ].filter(Boolean).join('');
      mainParts = null;
    }

    var bodyContent = isSide
      ? sideHTML + '<div class="r-main">' + profileHTML(resume.profile) + extraMain + '</div>'
      : profileHTML(resume.profile) + mainParts.join('') + skillsSectionHTML(resume.skills);

    // data-tpl 用于 CSS 选择器区分模板
    return '<div class="r-page tpl-' + esc(tpl) + '" data-tpl="' + esc(tpl) + '">' + bodyContent + '</div>';
  }

  global.ResumeRender = {
    render: render,
    esc: esc,
    splitSkills: splitSkills
  };
})(window);
