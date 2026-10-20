# Nimbus — 产品落地页

简约现代风格的静态产品落地页，零依赖、零构建，可直接托管在 GitHub Pages。

## 本地预览

```bash
# 任选其一
python3 -m http.server 8000
npx serve .
```

打开 http://localhost:8000

## 部署到 GitHub Pages

**方式一：首次发布（推荐）**

```bash
git init
git add .
git commit -m "feat: landing page"
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

然后进入仓库 **Settings → Pages → Source**，选择 `Deploy from a branch`，分支选 `main`、目录选 `/ (root)`，保存。

约 1 分钟后访问：`https://<你的用户名>.github.io/<仓库名>/`

**方式二：GitHub Actions 自动部署（已内置）**

推送到 `main` 后，Actions 会自动构建并发布，无需手动配置 Settings（首次需在 Settings → Pages → Source 中选择 `GitHub Actions`）。

## 修改内容

| 文件 | 说明 |
|---|---|
| `index.html` | 页面结构，文案均为占位内容，直接搜索替换即可 |
| `css/style.css` | 全部样式，设计令牌集中在文件顶部的 `:root` 变量中 |
| `js/main.js` | 交互脚本（导航、菜单、入场动画、代码 Tab、复制、表单校验） |
| `assets/` | SVG favicon 与 OG 分享封面 |

## 技术说明

- 纯 HTML/CSS/原生 JS，无任何构建步骤和第三方依赖
- 响应式适配桌面 / 平板 / 手机（断点：980px / 820px / 620px）
- 支持 `prefers-reduced-motion`，键盘可访问（skip-link、focus 样式、Esc 关闭菜单）
- CTA 表单为演示用途，接入后端时替换 `js/main.js` 中 `initForm` 的提交逻辑
