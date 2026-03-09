<!-- CONFIG_README.md --> 

# 系统配置说明

本项目采用统一配置文件管理系统名称、端口等配置信息，修改配置只需在一个地方进行，即可应用到整个系统。

## 📝 配置文件位置

### 🔹 前端配置
- **文件位置**: `client/src/config.js`
- **用途**: 管理前端应用的系统名称、API地址、端口等配置
- **修改项**:
  - `systemName` - 系统中文名称
  - `systemEnglishName` - 系统英文名称
  - `systemDescription` - 系统描述/标语
  - `devPort` - 前端开发服务器端口
  - `serverUrl` - 后端服务地址
  - `company.name` - 公司名称

### 🔹 后端配置
- **文件位置**: `server/src/config/app.js`
- **用途**: 管理后端服务的系统名称、端口、数据库配置等
- **修改项**:
  - `systemName` - 系统中文名称
  - `systemEnglishName` - 系统英文名称
  - `systemDescription` - 系统描述/标语
  - `server.port` - 后端服务端口
  - `database` - 数据库连接配置
  - `company.name` - 公司名称

### 🔹 启动脚本配置
- **文件位置**: `config.bat`
- **用途**: 管理启动脚本所需的配置信息
- **修改项**:
  - `SYSTEM_NAME` - 系统名称
  - `SYSTEM_NAME_EN` - 系统英文名称
  - `SYSTEM_DESC` - 系统描述
  - `CLIENT_PORT` - 前端端口
  - `SERVER_PORT` - 后端端口
  - `DB_*` - 数据库相关配置

## 🚀 使用步骤

### 修改系统名称（以改为"上海煌祁"为例）

#### 1️⃣ 修改前端配置

编辑 `client/src/config.js`:

```javascript
export const APP_CONFIG = {
  systemName: '上海煌祁流转系统',              // 改为新名称
  systemEnglishName: 'Shanghai HuangQi Ledger', // 改为新英文名
  systemDescription: '业务流转与结算中枢',      // 改为新描述
  company: {
    name: '上海煌祁',                          // 改为新公司名
    fullName: '上海煌祁有限公司'
  }
}
```

**影响范围**:
- ✅ 登录页面标题
- ✅ 页面标题后缀 (浏览器标签栏)
- ✅ 任何使用 `APP_CONFIG` 的组件

#### 2️⃣ 修改后端配置

编辑 `server/src/config/app.js`:

```javascript
const APP_CONFIG = {
  systemName: '上海煌祁流转系统',
  systemEnglishName: 'Shanghai HuangQi Ledger',
  systemDescription: '业务流转与结算中枢',
  company: {
    name: '上海煌祁',
    fullName: '上海煌祁有限公司'
  }
}
```

**影响范围**:
- ✅ 后端响应中的系统信息
- ✅ 日志输出中的系统名称

#### 3️⃣ 修改启动脚本配置

编辑 `config.bat`:

```batch
set SYSTEM_NAME=上海煌祁流转系统
set SYSTEM_NAME_EN=Shanghai HuangQi Ledger
set SYSTEM_DESC=业务流转与结算中枢
```

**影响范围**:
- ✅ 启动脚本显示的系统名称
- ✅ 启动时打印的欢迎信息

### 修改其他配置

#### 修改端口号

**前端端口**: 编辑 `client/src/config.js` 中的 `devPort`
**后端端口**: 编辑 `server/src/config/app.js` 中的 `server.port` 或 `config.bat` 中的 `SERVER_PORT`

#### 修改数据库配置

编辑 `config.bat`:

```batch
set DB_HOST=localhost
set DB_USER=root
set DB_PASSWORD=your_password
set DB_NAME=xuwu_ledger
set DB_PORT=3306
```

或编辑 `server/src/config/app.js`:

```javascript
database: {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'xuwu_ledger',
  port: 3306
}
```

## 📍 配置在代码中的使用位置

### 前端使用示例

```javascript
// 导入配置
import { APP_CONFIG } from '../config'

// 在组件中使用
export default {
  data() {
    return {
      appName: APP_CONFIG.systemName,
      appDesc: APP_CONFIG.systemDescription
    }
  }
}

// 在 Vue 3 Composition API 中使用
import { APP_CONFIG } from '../config'
const appConfig = APP_CONFIG
```

### 已修改的文件

已自动集成配置的文件:
- ✅ `client/src/views/Login.vue` - 登录页面
- ✅ `client/src/router/index.js` - 路由守卫（页面标题）
- ✅ `startup.bat` - 启动脚本

### 后端使用示例

```javascript
// 引入配置
const APP_CONFIG = require('./config/app.js')

// 在代码中使用
console.log(`系统 ${APP_CONFIG.systemName} 启动成功`)
app.use((req, res, next) => {
  res.header('X-System-Name', APP_CONFIG.systemName)
  next()
})
```

## ✨ 优势

- 🎯 **单一真实来源** - 所有配置只需在配置文件中定义一次
- 🔄 **易于维护** - 修改配置无需查找散落在代码各处的硬编码值
- 🚀 **高效切换** - 快速切换不同的系统名称和配置
- 📊 **环境适配** - 支持不同环境（开发/生产）使用不同配置
- 🔒 **安全管理** - 敏感信息（如密码）可以通过环境变量覆盖

## 🔗 相关文档

- [项目 README](README.md)
- [产品 PRD](PRD.md)

## 📧 注意事项

- 修改配置后，需要重启对应的服务才能生效
- 数据库配置修改后，确保数据库实际存在
- 环境变量会覆盖配置文件中的值 (适用于生产环境)
