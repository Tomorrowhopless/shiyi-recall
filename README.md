# 拾忆

拾忆是一个中文主动回忆与间隔复习网站，支持数学公式、解题方法和英语单词词组。无需登录，卡片、笔记和学习进度保存在访问者自己的浏览器中。

[GitHub Pages 在线使用](https://tomorrowhopless.github.io/shiyi-recall/) · [Cloudflare 在线使用](https://shiyi-recall.pages.dev/) · [使用说明](制作与使用说明.md)

## 学习内容

首次使用提供 76 张通用数学卡片，可继续添加、编辑或删除：

| 部分 | 公式卡 | 题型卡 |
| --- | ---: | ---: |
| 高数 | 28 | 10 |
| 概率论 | 14 | 6 |
| 线性代数 | 12 | 6 |

公式卡包含表达式、适用条件和易错点；题型卡包含识别特征、解题方法及例题。基础库用于起步学习，并非完整考纲题库。当前界面不包含物理。

英语资料由使用者自行添加或导入。公开程序不包含个人英语词库、笔记、录音或复习记录。

## 功能

- 使用 [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) 根据回忆评分安排复习，到期卡片优先，新卡按每日额度加入。
- 问答卡、填空卡和 [KaTeX](https://github.com/KaTeX/KaTeX) 数学公式，支持实时编辑预览。
- 数学三部分与公式／题型分类，英语单词／词组筛选、全文搜索和每页 30 张的分页列表。
- 四档评分、撤销最近一次评分、学习记录和最近七天回想统计。
- 英语支持“英背中 / 中背英”切换，两个方向覆盖同一份完整词库，数量相同、按资料库顺序逐条对应；切换时保留当前词条编号。英语全部内容不受每日新卡上限限制，评分仍保存复习进度。两种模式只自动朗读英文，保留重播与停止按钮；中背英只在揭晓英文答案后朗读。
- 完整 JSON 备份的下载、复制、只读文本展示、校验与去重合并，保留较新的内容和复习进度。
- 导入 Reading Lab 本地 ZIP、知识 JSON 或个人备份，仅提取单词与词组，保留释义、音标、例句、来源和笔记。
- 英语朗读优先复用已安装的 word-pronunciation 4.7.1 本地插件（Piper Cori 英式语音），无需上传词条或复制模型到网站；其他访问者使用浏览器英语语音。过滤中文提示、音标与公式，界面显示实际语音名称，支持重播、停止、键盘操作和移动端布局。
- 处理存储不可用、容量不足、损坏备份和多标签页写入冲突。

## 资料保存

资料由浏览器本地保存，不上传到本站服务器，也不会随代码部署发布。不同浏览器、个人资料、设备、域名及端口使用独立存储，没有云同步。建议固定使用同一浏览器和网址，并定期导出完整备份。

清除网站数据或使用隐私窗口可能导致资料无法保留。换浏览器、设备或网址时，先在原环境导出或复制备份，再在新环境导入。网站需要能够加载程序；当前没有离线安装服务工作线程。

## 本地开发与验证

需要 Node.js 20.19+ 或 22.12+，以及 npm。

```sh
npm ci
npm run dev
```

开发页面为 `http://127.0.0.1:5173/`。测试、构建和预览：

```sh
npm test
npm run build
npm run preview
```

构建输出位于 `dist/`；预览页面为 `http://127.0.0.1:4173/`。开发、预览和线上地址的资料分别保存。

## 部署到 Cloudflare Pages

当前在线体验由 [Cloudflare Pages](https://shiyi-recall.pages.dev/) 提供。部署自己的实例时，只上传程序构建目录，勿加入个人备份或学习资料。

```sh
npm ci
npm test
npm run build
```

在 Cloudflare Pages 使用 Direct Upload 上传 `dist/` 的全部内容，确保 `index.html` 位于上传根目录。也可运行 `python3 scripts/package-release.py` 生成上传 ZIP；该脚本只打包 `dist/` 并生成文件哈希清单，输出目录 `Cloudflare发布/` 不提交到仓库。

使用 Git 集成时，构建命令为 `npm run build`，输出目录为 `dist`。项目名、域名与部署权限由部署者自行设置。参见 [Cloudflare Direct Upload 文档](https://developers.cloudflare.com/pages/get-started/direct-upload/)。

## 部署到 GitHub Pages

仓库已包含 [GitHub Actions 工作流](.github/workflows/pages.yml)：向 `main` 提交后自动安装依赖、运行测试、构建并发布 `dist/`。仓库设置中的 Pages 来源应选择 **GitHub Actions**。

仓库项目站点通常位于 `https://用户名.github.io/仓库名/`，构建时须带上仓库子路径：

```sh
npm ci
npm test
npm run build -- --base=/仓库名/
```

Actions 工作流应根据仓库名设置 `base`，随后上传 `dist/` 为 Pages 构建产物并部署。用户或组织根站点、使用根路径的自定义域名应改用 `--base=/`。Pages 与 Cloudflare 是不同网址，各自保存浏览器资料；切换部署地址需手动导入备份。

## 可选 macOS 入口

macOS 可选用项目中的 `拾忆网站.app`，双击后固定通过 Microsoft Edge 打开正式卡片库，不启动终端或本地服务。它只是网页快捷入口；网站本身不要求使用 Edge，其他现代浏览器可直接访问在线链接。

## 项目结构

| 路径 | 职责 |
| --- | --- |
| `src/main.js`、`src/style.css` | 中文界面、学习会话、编辑器和备份交互 |
| `src/core.js`、`src/storage.js` | 调度、卡片、备份合并与浏览器存储保护 |
| `src/math-content.js`、`src/math-library.js` | 通用数学基础库与分类 |
| `src/readinglab-import.js`、`src/import-workflow.js` | 本地资料校验、转换、去重和兼容清理 |
| `src/seed.js` | 识别旧备份中未修改示例的兼容模块 |
| `tests/` | 使用合成资料的学习逻辑与边界测试 |
| `public/` | 图标、部署响应头和第三方许可说明 |
| `scripts/` | 本地预览与发布包工具 |

第三方组件及其许可见 [THIRD_PARTY_NOTICES.txt](public/THIRD_PARTY_NOTICES.txt)。

本地语音连接只在拾忆正式域名接受播放、停止与状态消息，不提供文件、词库或设置访问。插件升级后需在 Edge 中重新加载插件，并刷新网站；无插件时网站仍可学习和使用浏览器英语语音。
