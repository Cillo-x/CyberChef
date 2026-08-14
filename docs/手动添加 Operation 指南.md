# 手动添加 Operation 指南

这是一份给人工维护者的中文笔记。它不依赖 AI Agent；只要按照下面的步骤，就可以在这个 self-hosted CyberChef fork 中添加、测试、构建和部署一个 Operation。

## 1. 先确认运行环境

这个 fork 约定把职责分成两部分：

- **devcontainer**：安装依赖、编写和检查代码、运行测试、执行生产构建。
- **Windows 主机**：只运行本地 Wrangler 预览服务器。

仓库要求 Node.js `>=24 <25`。在仓库根目录启动已经配置好的 devcontainer：

```text
up
```

如果当前终端没有 `up` 这个辅助命令，可以使用等价命令：

```text
devcontainer up --workspace-folder .
```

之后建议在 VS Code 的 devcontainer 终端中执行下面的命令。也可以从 Windows 主机使用：

```text
devcontainer exec --workspace-folder . <command>
```

不要在 Windows 主机中执行 `npm install` 或生产构建。依赖安装由 devcontainer 创建后的配置负责完成。

## 2. 生成 Operation 骨架

在 devcontainer 终端、仓库根目录执行：

```text
npm run newop
```

这是交互式生成器，需要依次填写：

- Operation 名称
- 模块名称。没有大型额外依赖时使用 `Default`
- 描述和可选的信息链接
- 输入类型和输出类型
- 是否支持高亮
- 作者信息

生成器会创建两个文件：

```text
src/core/operations/<Operation>.mjs
tests/operations/tests/<Operation>.mjs
```

如果 Operation 不依赖大型库，通常使用 `Default` 模块即可。需要大型依赖时，应参考已有模块，把它放到合适的独立模块中，避免增加初始页面体积。

## 3. 实现代码

Operation 的基本结构包括：

```js
import Operation from "../Operation.mjs";

class ExampleOperation extends Operation {
    constructor() {
        super();

        this.name = "Example Operation";
        this.module = "Default";
        this.description = "描述这个 Operation 的行为。";
        this.inputType = "byteArray";
        this.outputType = "byteArray";
        this.args = [];
    }

    run(input, args) {
        return input;
    }
}

export default ExampleOperation;
```

实现时遵循仓库已有风格：4 个空格缩进、UTF-8、Unix 换行、文件末尾保留换行。

参数约束应写在 `args` 的 Ingredient 元数据中，让 CyberChef 在 `run()` 前完成校验。对于用户输入导致的可预期失败，使用：

```js
import OperationError from "../errors/OperationError.mjs";

throw new OperationError("清晰描述问题");
```

`OperationError` 会被 Recipe 作为可显示的 Operation 输出处理，不是程序崩溃。测试这类情况时，应比较输出的错误文本，而不是默认设置 `expectedError`。

## 4. 加入分类

分类配置位于：

```text
src/core/config/Categories.json
```

这个 fork 的自定义工具统一放在 `Custom Extension` 分类下：

```json
{
    "name": "Custom Extension",
    "ops": [
        "Example Operation"
    ]
}
```

建议把自定义分类保持在官方分类之外，减少以后从 upstream 合并时的冲突。配置文件和各种生成索引会在测试或构建时自动重新生成，不要手工编辑 `src/core/config/modules/`、`OperationConfig.json` 或生成的 Operation index。

## 5. 编写测试

Operation 测试放在：

```text
tests/operations/tests/<Operation>.mjs
```

测试至少应覆盖：

- 一个正常输入
- 空输入或最小输入
- 边界值和特殊字节
- 参数无效或输入无法处理时的错误输出
- 会改变输出类型时的下游转换，例如接 `To Hex` 验证原始字节

常见测试结构：

```js
import TestRegister from "../../lib/TestRegister.mjs";

TestRegister.addTests([
    {
        name: "Example Operation: basic case",
        input: "input",
        expectedOutput: "output",
        recipeConfig: [
            {
                op: "Example Operation",
                args: []
            }
        ]
    }
]);
```

完整非 UI 测试命令是：

```text
npm test
```

它会先生成配置，然后运行 Node API 测试和全部 Operation 测试。

## 6. 运行 lint

在 devcontainer 中执行：

```text
npm run lint
```

可选的源码拼写检查命令是：

```text
npm run lint:grammar
```

如果全量拼写检查报告大量已有术语问题，不要为了一个新 Operation 修改无关文件；可以针对新增文件单独运行：

```text
npx cspell src/core/operations/ExampleOperation.mjs
```

提交前也应检查：

```text
git diff --check
git status --short
```

## 7. 更新 Cloudflare 预览构建

预览和 Cloudflare 部署实际使用的是：

```text
deploy/cyberchef
```

不是 `build/prod`。因此不能只运行：

```text
npm run build
```

正确的 fork 构建命令是：

```text
npm run build:deploy
```

它会完成以下工作：

1. 运行生产 Webpack 构建。
2. 生成配置和按需加载模块。
3. 处理 Windows bind mount 上预期的 `chmod EPERM`。
4. 将可部署内容复制到 `deploy/cyberchef`。

构建前先停止 Windows 上的 Wrangler 预览。准备脚本会替换整个 `deploy` 目录；如果 `workerd` 仍在运行，Windows 可能锁住目录并导致 `EACCES`。

## 8. 启动 Windows 预览

构建完成后，在 Windows 主机、仓库根目录启动一个 Wrangler 实例：

```text
npx --yes wrangler@4.122.0 dev --ip 127.0.0.1 --port 8080
```

只保留一个 8080 预览实例。访问：

```text
http://127.0.0.1:8080/cyberchef/
```

如果页面看不到刚添加的 Operation，依次检查：

1. `deploy/cyberchef/assets/main.js` 的更新时间是否已经更新。
2. 该文件是否包含新 Operation 的名称。
3. 8080 是否存在多个 Wrangler/workerd 进程。
4. 浏览器是否需要强制刷新。

## 9. 正式部署

确认代码和预览都没有问题后，在 devcontainer 中执行：

```text
npm run deploy
```

这个命令会先运行 `npm run build:deploy`，再执行 `wrangler deploy`。它会产生外部部署效果，只应在明确准备发布时执行。

## 10. 从 upstream 同步

同步前先保存或提交自己的修改，避免把自定义 Operation 和 upstream 改动混在同一个未完成工作区中：

```text
git status --short
git fetch upstream
git log --oneline --decorate -5
```

重点检查这些文件的冲突：

- `src/core/config/Categories.json`
- `AGENTS.md`
- upstream 同时修改的 Operation 或测试文件

自定义 Operation 文件和 `docs/` 下的 fork 文档通常不会与 upstream 同名，冲突面较小。
