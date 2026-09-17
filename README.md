# Max Xiang · Portfolio & 颗粒

Yancheng Max Xiang 的个人网站：数据分析作品集，以及中文写作与摄影空间「颗粒 / GRAIN」。

- [个人主页](https://yanchengxiang.com/)：职业介绍、技能、项目与联系方式。
- [文章书架](https://yanchengxiang.com/blog/)：抽出一本书，开始阅读。
- [摄影暗房](https://yanchengxiang.com/blog/photos/)：拉动灯绳，让照片慢慢显影。

主页的「你会说中文吗」连接中文博客；博客页脚的「作品集」返回主页。

## 直接在 GitHub 写文章（推荐）

1. 打开仓库的 [content/posts](https://github.com/SpaceCowboy0707/spacecowboy0707.github.io/tree/main/content/posts) 目录，点击 **Add file → Create new file**。
2. 文件名填写类似 `my-new-post.md`，粘贴下方「写一篇文章」中的模板，修改标题、日期与正文。
3. 点击 **Commit changes**，提交到 `main`。如果选择新分支，则合并 Pull Request 后发布。
4. GitHub 自动生成网页、书架和分享图，检查通过后发布。到 [Actions](https://github.com/SpaceCowboy0707/spacecowboy0707.github.io/actions/workflows/pages.yml) 查看进度，绿色表示成功。

**不需要本机、不需要运行命令，也不需要再发送 prompt。** 修改、删除现有 Markdown 或更新照片数据，也会自动触发发布。构建失败时不会覆盖上一次成功发布的网站；点开失败的步骤即可查看原因。

## 技术与设计

浏览器端使用原生 HTML、CSS 和 JavaScript。每篇文章都是独立的静态 HTML 页面，正文、canonical 和社交分享元信息都在初始 HTML 中，不依赖 JavaScript 才能读取。

文章源文件采用 Markdown，通过小型 Node.js 构建脚本生成页面。构建依赖仅有 `marked`（Markdown 渲染）和 `sharp`（生成 PNG 分享图）；没有客户端框架或后端服务。

书架和纸张风格保留。站内导航使用渐进增强：正常链接支持新窗口打开；JavaScript 可用时预取即将访问的页面，使用 transform / opacity 做翻书、收书和淡入动画。系统选择减少动态效果时跳过转场。

## 文件结构

```text
.
├── index.html                 # 个人主页，直接编辑
├── CNAME                      # 自定义域名
├── .nojekyll                  # 直接发布生成的静态文件
├── content/
│   ├── site.json              # 站点 URL 与说明
│   ├── photos.json            # 照片列表
│   └── posts/*.md             # 每篇文章一个文件，主要编辑入口
├── templates/blog.html        # 博客共用 HTML 模板
├── assets/
│   ├── blog.css               # 博客样式
│   ├── blog.js                # 路由增强、动画和暗房交互
│   ├── photos.js              # 自动生成的照片数据
│   └── share/*.png            # 自动生成的 1200 × 630 分享图
├── blog/
│   ├── index.html             # 自动生成的书架
│   ├── posts/<slug>/index.html # 自动生成的独立文章
│   └── photos/                # 原始照片及自动生成的摄影页
├── scripts/
│   ├── build.cjs              # 生成静态页面、分享图和 sitemap
│   └── serve.cjs              # 本地预览服务器
├── tests/build.test.cjs        # 页面、元信息、图片及链接校验
├── sitemap.xml                # 自动生成
└── robots.txt                 # 自动生成
```

`blog/` 下的 HTML 是构建产物，不要直接编辑。GitHub Actions 每次会从 Markdown 重新生成并发布，不需要手动提交生成文件。仓库中的旧生成文件仅用于本地快速预览，可能落后于线上内容。

## 本地运行

准备 Node.js **22.13 或更高版本**，以及 pnpm **11.19.0**。

```bash
git clone https://github.com/SpaceCowboy0707/spacecowboy0707.github.io.git
cd spacecowboy0707.github.io
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm preview
```

打开 <http://127.0.0.1:8000/> 或 <http://127.0.0.1:8000/blog/>。停止预览时按 `Ctrl+C`。服务器只监听本机。

如果只是预览已经生成的页面，有 Node.js 即可直接运行 `node scripts/serve.cjs`，不必安装依赖。字体通过 Google Fonts 加载，断网时使用系统备用字体。

分享图通过系统字体渲染中文。Windows 使用 Microsoft YaHei 等字体；Linux 构建环境请先安装 Noto CJK 字体（例如 Debian/Ubuntu 的 `fonts-noto-cjk`）。仓库已包含生成好的 PNG，部署时不需要重新渲染图片。

## 写一篇文章

在 `content/posts/` 新建文件，例如 `a-new-note.md`：

```markdown
---
title: "一篇新的记录"
date: "2026.09.16"
---

这是第一段。

这是第二段。段落之间留一个空行。

## 第一章

这里可以使用 **粗体**、[链接](https://example.com/) 和列表。
```

- 文件名决定地址：`a-new-note.md` → `/blog/posts/a-new-note/`。使用小写英文字母、数字和连字符。
- 顶部元信息使用 `字段: JSON 值` 的简单格式，字符串请用双引号包裹；字符串里的双引号写成 `\"`。这不是完整的 YAML 解析器。
- `title`、`date` 必填。日期支持 `2026`、`2026.09`、`2026.09.16`，按日期从新到旧排列。
- 诗歌可以增加 `poem: true`，启用无首行缩进的排版。单行换行可使用 Markdown 的行末两个空格；不同段落留空行。
- 可使用 Markdown 标题、链接、引用、列表、代码块、表格与图片。站内图片建议使用 `/blog/photos/文件名.jpeg` 这样的根路径。
- Markdown 中的 HTML 会被保留，内容来自仓库中的文章文件。
- 已发布文章尽量不要改文件名，以免已有链接失效。

在 GitHub 编辑时，提交后自动构建。只有本地开发预览时才需要运行：

```bash
pnpm build
pnpm test
```

构建会生成文章 HTML、书架链接、相邻文章导航、sitemap，以及带文章标题和日期的独立分享图。原有 `/blog/#/p/<slug>` 和 `/blog/#/photos` 链接在 JavaScript 可用时会自动转到新地址。

## 更新照片和样式

把照片放入 `blog/photos/`，然后编辑 `content/photos.json`：

```json
{
  "src": "/blog/photos/new-photo.jpeg",
  "caption": "照片标题",
  "date": "2026",
  "position": "50% 50%",
  "crop": "4 / 3"
}
```

记录之间需要逗号，最后一条后面不要加逗号。照片按数组顺序展示；`position` 控制裁剪焦点，`crop` 控制缩略图比例。在 GitHub 提交后自动发布；本地预览时运行 `pnpm build`。

博客外观在 `assets/blog.css` 修改，交互在 `assets/blog.js` 修改，共用页头和页脚在 `templates/blog.html` 修改。模板修改提交后也会自动构建。主页继续直接编辑根目录的 `index.html`。

## 自动发布

工作流位于 `.github/workflows/pages.yml`：

- 提交到 `main`：安装依赖与中文字体 → 生成文章和分享图 → 校验 → 发布。
- Pull Request：构建和校验，不发布。
- Actions 页面可通过 **Run workflow** 手动重试。

仓库 **Settings → Pages → Source** 使用 **GitHub Actions**。发布文件由 `scripts/stage-site.cjs` 整理到 `_site/`，只包含网站所需文件，不上传 `node_modules`、构建脚本或 Markdown 源文件。新增文章配图可以放在 `images/` 或 `assets/images/` 中，并在 Markdown 使用相应的根路径。

本地改动仍需 commit 和 push；在 GitHub 网页上编辑则直接点 Commit changes。生成文件不会自动回写到源码分支，因此不会产生循环构建。

当前域名由 `CNAME` 声明为 `yanchengxiang.com`。更换域名时，同时修改 `content/site.json` 中的 `url`、GitHub Pages 配置和 DNS，再提交即可自动构建。

分享平台可能缓存旧卡片，实际显示也受平台规则影响；每篇文章的初始 HTML 已包含 Open Graph 和 Twitter Card 元信息。

## 检查清单

- `pnpm test` 检查每篇文章的独立页面、元信息、分享图尺寸、静态链接和 sitemap。
- 预览桌面和手机宽度，检查主页中文入口、书架、文章刷新和浏览器前进/返回。
- 检查连续点击、按住 Ctrl/Cmd 打开新标签、系统减少动画模式。
- 检查暗房显影、照片放大、Esc 关闭与键盘焦点。
- 提交前运行 `git diff --check`。

主页头像、Resume 链接及首页的 favicon / `og.png` 仍待补齐；文章的分享图已独立生成，不依赖首页的 `og.png`。
