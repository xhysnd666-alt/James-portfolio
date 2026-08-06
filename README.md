# 谢涵羽 · 玩家档案(个人展示网站)

一个纯 HTML / CSS / JS 的像素游戏风个人展示页,用来在简历后面加分:
包含个人档案、教育背景、实习经历、技能雷达图、游戏玩家档案、作品集、Stroop 心理学小实验、运营人格测试和简历二维码。

## 本地预览

直接双击 `index.html` 就能打开;也可以用本地服务器(效果一致):

```bash
python -m http.server 8000
```

然后访问 `http://localhost:8000`。

## 文件结构

```
portfolio-site/
├─ index.html        # 页面结构和大部分文字内容(直接改这里)
├─ css/style.css     # 像素风样式,想改颜色改顶部 :root 变量
├─ js/script.js      # 交互和数据(联系方式、雷达图、作品集、测试题)
├─ js/qrcode.min.js  # 二维码生成库(已内置,无需联网)
├─ assets/resume.pdf # 简历 PDF(可随时替换成新版本)
└─ README.md         # 本说明
```

## 改内容:在哪里改

| 想改什么 | 去哪个文件 |
|---|---|
| 姓名、介绍、经历、教育文字 | `index.html` |
| 颜色主题 | `css/style.css` 顶部 `:root` |
| 邮箱、电话、简历二维码地址 | `js/script.js` 顶部 `CONFIG` |
| 雷达图能力与说明 | `js/script.js` 的 `SKILLS` |
| 技能标签 | `js/script.js` 的 `TAGS` |
| 作品集卡片 | `js/script.js` 的 `WORKS` |
| 运营人格测试题 | `js/script.js` 的 `QUIZ` 与 `QUIZ_TYPES` |

## 替换作品集占位卡片

1. 把作品截图放进 `assets/`(例如 `assets/works-1.png`);
2. 在 `js/script.js` 的 `WORKS` 里,给对应作品加上图片字段,例如:

```js
{ icon: "📝", title: "...", meta: "...", desc: "...", img: "assets/works-1.png", note: "..." }
```

3. 建议后续把弹窗里的占位图案替换成 `<img src="...">`(目前弹窗展示的是图标占位)。

## 部署到 GitHub Pages

1. 在 GitHub 上新建一个仓库(名字随意,比如 `portfolio`);
2. 把本文件夹里的所有文件上传到仓库(或在本地终端用 git 推送);
3. 打开仓库 **Settings → Pages**,在 Source 里选择 **Deploy from a branch**,分支选 `main`,目录选 `/ (root)`;
4. 等待 1~2 分钟,你的网站就会出现在:
   `https://你的用户名.github.io/你的仓库名/`

### 更新简历二维码

二维码是根据 `js/script.js` 顶部的 `CONFIG.RESUME_URL` 在打开页面时自动生成的,所以部署后:

1. 把 `RESUME_URL` 改成你的简历直链,例如:
   `https://你的用户名.github.io/你的仓库名/assets/resume.pdf`
2. 重新推送代码,二维码就自动指向新地址了,不用手动生成图片。

## 小提示

- 音效开关在导航栏右侧(小屏会隐藏,不影响体验);
- 简历 PDF 可以直接替换 `assets/resume.pdf`,文件名保持不变即可;
- 想给面试官留印象,推荐把 Stroop 测试和人格测试玩一遍——这也是「心理学 × 游戏」的最好自我介绍。
