# IELTS AI Tutor - 雅思AI学习助手

微信小程序，利用 AI（DeepSeek/GLM/火山引擎）辅助雅思学习。

## 功能模块

| 模块 | 功能 |
|------|------|
| **口语对练** | Part 1/2/3 模拟考官，四维度打分（流利度/词汇/语法/发音），改进建议 |
| **写作批改** | Task 1/2 逐句批改，Band 评分，Band 7+ 改写版本，高分词汇提取 |
| **词汇学习** | 场景故事记忆、填空测验、同义替换提取、词根词缀学习 |
| **学习进度** | 学习概览、连续打卡、历史记录、学习数据统计 |

## 部署步骤

### 1. 创建微信小程序

1. 在 [微信公众平台](https://mp.weixin.qq.com/) 注册小程序（个人或企业）
2. 获取 AppID
3. 开通云开发（微信开发者工具 → 云开发 → 开通）

### 2. 配置项目

编辑 `miniprogram/project.config.json`，将 `appid` 改为你的 AppID

编辑 `miniprogram/app.js`，将 `env` 改为你的云环境 ID

### 3. 配置云函数环境变量

在微信开发者工具 → 云开发 → 云函数 → 配置环境变量，添加：

| 变量名 | 说明 |
|--------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（[platform.deepseek.com](https://platform.deepseek.com)） |
| `GLM_API_KEY` | GLM-4 API Key（[open.bigmodel.cn](https://open.bigmodel.cn)） |
| `VOLC_API_KEY` | 火山引擎 API Key |
| `VOLC_ENDPOINT_ID` | 火山引擎 Endpoint ID |

至少配置一个即可使用。

### 4. 上传云函数

在微信开发者工具中：
1. 右键 `cloudfunctions/` 下的每个云函数目录 → 上传并部署
2. 确保 `ai-proxy` 先部署（被其他云函数依赖）

### 5. 创建数据库集合

在云开发控制台创建以下集合：
- `user_stats` — 用户统计数据
- `daily_logs` — 每日学习日志
- `study_history` — 学习历史记录

### 6. 编译运行

在微信开发者工具中打开 `miniprogram/` 目录，点击编译即可。

## 项目结构

```
IELTS-AI-Tutor/
├── miniprogram/
│   ├── app.js              # 全局逻辑
│   ├── app.json            # 全局配置
│   ├── app.wxss            # 全局样式
│   ├── project.config.json # 项目配置
│   ├── sitemap.json
│   ├── images/             # tabBar 图标
│   ├── utils/
│   │   ├── prompts.js      # AI Prompt 模板
│   │   └── api.js          # AI 调用封装
│   ├── pages/
│   │   ├── index/          # 首页仪表盘
│   │   ├── speaking/       # 口语对练
│   │   ├── writing/        # 写作批改
│   │   ├── vocabulary/     # 词汇学习
│   │   └── profile/        # 学习进度
│   └── cloudfunctions/     # 云函数
│       ├── ai-proxy/       # AI API 代理
│       ├── ai-speak/       # 口语 AI
│       ├── ai-writing/     # 写作 AI
│       ├── ai-vocabulary/  # 词汇 AI
│       └── user-data/      # 用户数据管理
```

## 技术栈

- 微信小程序 + 云开发
- 云函数（Node.js）
- 云数据库（JSON 文档型）
- AI API：DeepSeek / GLM-4 / 火山引擎
