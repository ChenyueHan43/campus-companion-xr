# Campus Companion XR · 校园心灵伴侣

> **SPATIAL SHANGHAI 2026 · 24-Hour Hackathon**
> Track: Higher Education — Reshaping Campus Life with AI Agents

一套面向大学生的浏览器原生 **WebXR 心理健康陪伴平台**：把温暖治愈的 3D 校园融入桌面端、AR、VR（Meta Quest 3 / 3S）三种模态，并由智谱 GLM 驱动的同龄 AI 伙伴「乐乐」提供随时可达、零门槛、无评判的情绪与生活陪伴。

---

## 目录

- [项目背景](#项目背景)
- [核心功能](#核心功能)
- [五大主题区](#五大主题区)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速启动](#快速启动)
- [API 配置](#api-配置)
- [部署到 Vercel](#部署到-vercel)
- [设计理念](#设计理念)

---

## 项目背景

| 痛点 | 说明 |
| --- | --- |
| 社交焦虑普遍 | 约 1/3 的大学生表示自己孤独或有社交焦虑 |
| 心理咨询资源稀缺 | 一名校园咨询师常需面对 500–800 名学生 |
| 隐私顾虑 | 学生担心走官方渠道被贴标签 |
| 同龄陪伴缺失 | 学生需要的是平等聊天，而不是说教 |

**Campus Companion XR** 试图用「沉浸式空间 + 同龄人格 AI」补上这块缺口：把心理支持藏在一个像宿舍楼下那样松弛的虚拟校园里，学生想去就去，不必预约、不必登录。

---

## 核心功能

- **三模态体验**：同一份代码同时支持桌面端 OrbitControls 漫游、Meta Quest VR 沉浸式房间、移动端 AR 透视学习。
- **五大主题区**：每个区是一间独立 3D 房间，进入后 AI 自动切换对应人格 prompt。
- **AI 同龄伙伴「乐乐」**：基于智谱 GLM-4-Flash，OpenAI 兼容协议；按区域切换 system prompt，会倾听不会说教，遇到自伤话题温和引导专业资源。
- **Tripo 文生 3D**：登录后根据所选性别实时生成全身 GLB 形象作为伙伴外观；失败回退默认模型。
- **VR 房间内交互**：可走动陪伴角色 + 涂色 / 五子棋 / 视频面板等可交互组件（参见 `js/vr-interactive.js` 与 `js/vr-rooms.js`）。
- **AR 学习模式**：在学习区点击 AR 按钮即可发起 `immersive-ar` 会话，AI 家教叠加在真实环境中通过 dom-overlay 输入。
- **轻游戏区**：Canvas 2D 实现的正念涂色、五子棋、围棋、中国象棋。
- **语音输入**：Web Speech API，桌面 / VR HUD 内均可一键语音。
- **零数据存储**：对话仅存在于会话内存，无后端用户表，无 Cookie 追踪。

---

## 五大主题区

| 区域 | ID | 角度 | 主题色 | 用途 |
| --- | --- | --- | --- | --- |
| 谈心区 Chat Corner | `chat` | 90° | 暖珊瑚 `#E8A898` | 情绪倾诉、日常共情 |
| 学习区 Study Room | `study` | 18° | 静蓝 `#98B8D8` | 课业辅导、备考答疑、AR 家教 |
| 休闲区 Leisure Lounge | `leisure` | 306° | 雾紫 `#C0A0D8` | 书影音兴趣闲聊、VR 影院 |
| 疗愈区 Healing Garden | `healing` | 234° | 薄荷绿 `#98C8A0` | 正念冥想、书法、慢生活 |
| 轻游戏区 Game Zone | `games` | 162° | 暖金 `#E8D090` | 正念涂色 / 五子棋 / 围棋 / 象棋 |

> 区域定义、颜色、emoji 与对应人格 prompt 全部集中在 [`js/config.js`](js/config.js) 的 `ZONES` 数组里，后续要扩展直接加一项即可。

---

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 3D 渲染 | Three.js `^0.184.0`（运行时通过 importmap 引用 `0.160.0`） · OrbitControls · GLTFLoader |
| 沉浸式 | WebXR Device API · `immersive-vr` · `immersive-ar` · XRControllerModelFactory |
| 文生 3D | Tripo AI（`api.tripo3d.ai/v2/openapi`，含 Vercel serverless 代理） |
| AI 对话 | 智谱 Zhipu GLM-4-Flash（OpenAI 兼容 `chat/completions`） |
| 语音 | Web Speech API（`SpeechRecognition`） |
| 前端 | 原生 HTML5 / CSS3 / ES Modules · Canvas 2D · 无构建工具 |
| 静态服务 | `serve`（开发） · Vercel（生产） |

---

## 项目结构

```
campus-companion-xr/
├── index.html              # 入口，所有 UI 容器与 importmap
├── css/style.css           # 治愈色调 UI 样式
├── js/
│   ├── main.js             # ES Module 入口：编排 Scene → XR → Avatar → Chat
│   ├── config.js           # API key、ZONES、AVATAR_PROMPTS、ROOM_FURNITURE_PROMPTS
│   ├── scene.js            # Three.js 中央大厅 + 5 个传送门 + 桌面相机飞行
│   ├── xr.js               # WebXR 会话管理、控制器、运动边界、可交互注册
│   ├── vr-rooms.js         # 5 个沉浸式 VR 房间（VR + 桌面共享）
│   ├── vr-interactive.js   # VR 内涂色板、五子棋盘、视频面板
│   ├── vr-panels.js        # VR HUD 聊天面板与快捷回复按钮
│   ├── ai-companion.js     # 房间内可走动的吉祥物伙伴
│   ├── agent.js            # 智谱 GLM 客户端 + 区域人格切换 + demo 回退
│   ├── chat.js             # 桌面聊天面板控制
│   ├── games.js            # 4 个 Canvas 2D 小游戏
│   ├── voice.js            # 语音输入封装
│   ├── tripo.js            # Tripo 文生 3D 客户端 + 轮询
│   └── tripo-loader.js     # GLB 模型挂载 / 居中 / 缩放
├── models/                 # 预生成的 GLB 家具与场景资产（37+ 个）
├── api/tripo/
│   ├── create.js           # POST 代理：转发到 Tripo openapi
│   ├── status.js           # GET 代理：轮询任务状态
│   └── proxy.js            # 统一代理入口
├── scripts/
│   ├── generate-models.mjs # 批量预生成 Tripo 模型脚本
│   └── tripo-models.js     # 模型 prompt 清单
├── public/                 # 站点 favicon 与占位图
├── package.json
├── vercel.json             # 配置 COOP / COEP 头（WebXR 需要）
└── README.md
```

---

## 快速启动

仓库使用 **pnpm**（仓库内有 `pnpm-lock.yaml`）。

```bash
# 1. 安装依赖
pnpm install

# 2. 启动本地静态服务（默认 3000 端口）
pnpm dev
# 等价于：npx serve . -p 3000
```

打开浏览器访问 `http://localhost:3000`，依次会看到：

1. 加载动画 + 进度条
2. **选择伙伴性别**（男 / 女） → 触发 Tripo 文生 3D
3. 鼠标拖拽环视中央大厅，点击发光的传送门进入对应区域
4. 区域内右下角 / HUD 中可与乐乐聊天，桌面端可点 Home 返回大厅
5. 头戴 Quest 3 / 3S 时显示 **Enter VR**，进入沉浸式房间；学习区显示 **AR Study**

> 浏览器要求：Chromium 系（Chrome / Edge）。VR 体验请使用 **Meta Quest Browser**；AR 透视需要支持 `immersive-ar` 的设备。

---

## API 配置

| Key | 用途 | 必填 |
| --- | --- | --- |
| `ZHIPU_API_KEY` | AI 同龄伙伴对话 | 可选（缺省走 demo 文案） |
| `TRIPO_API_KEY` | 文生 3D 形象 | 可选（缺省使用 `models/` 内预生成模型） |

写入位置：`js/config.js`

```js
const CONFIG = {
  TRIPO_API_KEY: '',                                    // 在此填入或交由 /api/tripo 代理
  ZHIPU_API_KEY: '',                                    // 智谱 BigModel 控制台获取
  ZHIPU_MODEL: 'glm-4-flash',
  TRIPO_BASE_URL: 'https://api.tripo3d.ai/v2/openapi',
  ZHIPU_BASE_URL: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  TRIPO_POLL_INTERVAL: 3000,
  TRIPO_MAX_POLLS: 60,
};
```

- 智谱 GLM 注册：[open.bigmodel.cn](https://open.bigmodel.cn)
- Tripo 注册：[platform.tripo3d.ai](https://platform.tripo3d.ai)

> 生产部署建议把 key 放在 Vercel 环境变量中，由 `api/tripo/*.js` 这三个 serverless 函数代理转发，避免在前端暴露密钥。

---

## 部署到 Vercel

仓库已包含 `vercel.json`，关键点：

- `framework: null` —— 当作纯静态站点 + serverless 代理
- 根目录自动 rewrite，使 `index.html` 与所有 `.glb` / `.js` 直接可访问
- 强制 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp` —— **WebXR 与 SharedArrayBuffer 所必需**

部署：

```bash
# 关联本仓库到 Vercel 项目后
vercel --prod
```

或直接连接 GitHub：本仓库 `main` 分支推送即触发自动部署。

---

## 设计理念

- **治愈色板**：低饱和暖色（米白、陶土、鼠尾草、雾粉），避免冷蓝医疗感。
- **零门槛接入**：无需 VR 头显、无需安装、无需登录。Quest 用户进阶为沉浸式体验，普通用户拖拽即可探索同一份场景。
- **同龄人格**：「乐乐」是一名中国大学生伙伴，不诊断、不开方、不说教；遇到自伤 / 危机话题会温和指引专业资源。
- **隐私优先**：所有对话只存在内存中，关闭页面即销毁。
- **可扩展**：增加一个新区域只需在 `ZONES` 加一项 + 在 `vr-rooms.js` 注册一间 VR 房间。

---

## 赛道契合度

| 评分维度 | 我们的覆盖 |
| --- | --- |
| AR / VR / WebXR | Three.js + WebXR `immersive-vr` & `immersive-ar`，浏览器原生 |
| AI Agent | GLM 区域人格切换 + 多轮记忆 + demo 回退 |
| 高等教育 | 大学生心理健康 + 学业辅导 + 校园生活方式 |
| Tripo AI | 实时文生 3D 伙伴 + 预生成家具资产管线 |
| Demo-ready | 静态文件 + 一行 `pnpm dev` 即跑 |

---

## License & Credits

SPATIAL SHANGHAI 2026 · Higher Education Track 提交作品。

> Built in 24 hours for students who need a quiet corner.
