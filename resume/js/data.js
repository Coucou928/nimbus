/* ==========================================================================
   数据层：简历数据模型 + 常量表
   所有模块共享，不依赖 DOM
   ========================================================================== */
(function (global) {
  'use strict';

  /* 空白简历：新用户打开时的初始结构 */
  function blankResume() {
    return {
      meta: {
        // 当前使用的模板 id
        template: 'minimal',
        // 字号缩放，用于「一页自动排版」
        fontScale: 1,
        accent: '#1f2937'
      },
      profile: {
        name: '',
        title: '',
        phone: '',
        email: '',
        city: '',
        // 可选：个人主页 / GitHub / 作品集
        link: '',
        summary: ''
      },
      education: [
        { id: uid(), school: '', major: '', degree: '本科', start: '', end: '', gpa: '', detail: '' }
      ],
      experience: [
        { id: uid(), company: '', role: '', start: '', end: '', desc: '', visible: true }
      ],
      projects: [
        { id: uid(), name: '', role: '', start: '', end: '', desc: '', visible: true }
      ],
      skills: {
        // 技能以逗号或换行分隔的自由文本，避免过度结构化
        tech: '',
        soft: '',
        certs: ''
      },
      // 投递追踪（第三批启用，数据结构先预留）
      applications: []
    };
  }

  /* 模板清单：id 与 templates.css 中的 .tpl-<id> 对应 */
  var TEMPLATES = [
    { id: 'minimal',  name: '单页极简',  tag: '通用', desc: '白底黑字，ATS 最友好，校招首选' },
    { id: 'two-col',  name: '双栏技术',  tag: '技术', desc: '技能独立成栏，适合开发/算法岗' },
    { id: 'timeline', name: '时序成长',  tag: '实习', desc: '时间倒序突出成长线，多段实习' },
    { id: 'academic', name: '学术科研',  tag: '升学', desc: '论文与项目前置，考研保研适用' },
    { id: 'creative', name: '设计创意',  tag: '设计', desc: '左侧色块，适合设计/新媒体' },
    { id: 'business', name: '商务金融',  tag: '金融', desc: '严谨版式，证书与荣誉突出' },
    { id: 'product',  name: '产品运营',  tag: '产品', desc: '项目成果前置，动作数据化' },
    { id: 'fresher',  name: '实习新人',  tag: '新人', desc: '课程社团竞赛放大，经历较少' }
  ];

  /* 量化提示词：检测到这些虚词时提醒补数据 */
  var VAGUE_WORDS = ['负责', '参与', '协助', '配合', '做了', '帮助', '完成', '跟进'];

  /* 推荐动词库：弱动词 -> 强动词（按语境给候选） */
  var VERB_MAP = {
    '负责': ['主导', '统筹', '牵头'],
    '参与': ['深度参与', '协同推进', '承担'],
    '协助': ['支持', '配合推进', '承接'],
    '做了': ['完成', '落地', '实现'],
    '帮助': ['推动', '支撑', '赋能'],
    '完成': ['按期交付', '交付', '落地'],
    '跟进': ['持续跟进', '全流程跟进', '闭环管理']
  };

  var uid = function () {
    return 'x' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  };

  /* 深拷贝，避免引用共享 */
  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }

  /* 存储键 */
  var STORAGE_KEY = 'resume-builder-v1';

  var Store = {
    load: function () {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return blankResume();
        var data = JSON.parse(raw);
        // 简单结构校验与补全，防止旧数据结构导致渲染崩溃
        var base = blankResume();
        return deepMerge(base, data);
      } catch (e) {
        return blankResume();
      }
    },
    save: function (data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    },
    clear: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }
  };

  /* 以 base 为骨架，用 src 的值覆盖；数组直接取 src（保证用户数据优先） */
  function deepMerge(base, src) {
    if (src === null || src === undefined) return base;
    if (Array.isArray(base)) {
      return Array.isArray(src) ? src : base;
    }
    if (typeof base !== 'object') {
      return src === undefined ? base : src;
    }
    var out = {};
    Object.keys(base).forEach(function (k) {
      out[k] = deepMerge(base[k], src[k]);
    });
    // 保留 src 中 base 没有的键（向前兼容）
    Object.keys(src).forEach(function (k) {
      if (!(k in out)) out[k] = src[k];
    });
    return out;
  }

  global.ResumeData = {
    blankResume: blankResume,
    TEMPLATES: TEMPLATES,
    VAGUE_WORDS: VAGUE_WORDS,
    VERB_MAP: VERB_MAP,
    Store: Store,
    uid: uid,
    clone: clone
  };
})(window);
