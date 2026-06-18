# GROWTHOS

> **想做自媒体却不知道怎么开始？不知道怎么选赛道选题？**
> 
> **GROWTH 以涨粉→变现为唯一目标，帮助KOC 在小红书 + 微信视频号 + 抖音 + 公众号平台从0长出1w粉丝。**

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61dafb?logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript" />
  <img src="https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## 项目架构

```
GrowthOS/
├── client/                          # 前端 React 应用
│   ├── src/
│   │   ├── components/              # 组件库
│   │   │   ├── cards/               # 功能卡片
│   │   │   ├── chat/                # 聊天界面
│   │   │   ├── sidebar/             # 侧边栏模块
│   │   │   └── shared/              # 公共组件
│   │   ├── hooks/                   # React Hooks
│   │   ├── store/                   # 状态管理
│   │   ├── lib/                     # 工具库
│   │   └── index.css, main.tsx      # 入口文件
│   ├── vite.config.ts               # Vite 配置
│   ├── tailwind.config.js           # Tailwind 配置
│   └── package.json
│
├── server/                          # 后端 FastAPI 应用
│   ├── main.py                      # 应用入口
│   ├── config.py                    # 配置管理
│   ├── database.py                  # 数据库初始化
│   ├── agents/                      # 智能体模块
│   │   ├── orchestrator.py          # 主协调器
│   │   ├── content_agent.py         # 内容创作
│   │   ├── data_agent.py            # 数据分析
│   │   ├── niche_agent.py           # 赛道分析
│   │   ├── calendar_agent.py        # 日历规划
│   │   └── ...
│   ├── harness/                     # 执行引擎
│   │   ├── react_loop.py            # ReAct 循环核心
│   │   ├── attribution_loop.py      # 数据归因
│   │   ├── decision_logger.py       # 决策日志
│   │   └── ...
│   ├── tools/                       # 工具链
│   │   ├── registry.py              # 工具注册
│   │   ├── search_tool.py           # 搜索
│   │   ├── trends_tool.py           # 热点
│   │   ├── image_tool.py            # 配图
│   │   ├── ask_tool.py              # 交互
│   │   └── ...
│   ├── memory/                      # 记忆系统
│   │   ├── working_memory.py        # 工作记忆
│   │   ├── semantic_memory.py       # 语义记忆
│   │   └── episodic_memory.py       # 情节记忆
│   ├── routers/                     # API 路由
│   │   ├── chat.py, content.py      # 各功能路由
│   │   ├── data.py, trends.py
│   │   └── ...
│   ├── scheduler/                   # 定时任务
│   │   └── trend_scheduler.py       # 热点定时抓取
│   ├── .env.example                 # 环境变量示例
│   └── requirements.txt             # Python 依赖
│
├── PRD.md                           # 产品需求文档
├── .gitignore                       # Git 忽略规则
└── README.md                        # 本文件
```

## 功能特性

### 🎯 核心模块

- **赛道分析与选题策划**
  - 基于用户背景 + 兴趣智能推荐 3 条精准赛道
  - 竞争密度 & 变现路径分析
  - 自动生成选题示例与人设锚点

- **AI 内容创作**
  - 一键生成短视频脚本、封面文案、配图
  - 支持多平台内容适配（抖音/小红书/视频号/公众号）
  - 流式输出 + 工具调用支持

- **数据分析与归因**
  - 实时数据上报与分析
  - 内容表现与变现效果归因
  - 历史规律识别与下期建议

- **热点监测**
  - 实时抓取多平台热点话题（抖音/小红书/视频号/公众号）
  - 热度值解析与排序
  - 赛道相关性过滤

- **日历规划**
  - 发布计划管理
  - 内容库与草稿版本管理
  - A/B 测试辅助

 ## 页面演示

 <img width="1336" height="907" alt="截屏2026-06-04 22 21 36" src="https://github.com/user-attachments/assets/cbd4ddd5-1a03-46bc-a154-d2f9c880f10b" />
