# FHIR 如何获取用户的医院数据

## 概述

FHIR（Fast Healthcare Interoperability Resources）是 HL7 制定的医疗数据互操作标准。它通过 RESTful API 让第三方应用（如我们的可穿戴数据管道）访问患者在医院 EHR（电子健康记录）系统中的临床数据。

核心机制：**SMART on FHIR** + **OAuth 2.0** + **美国联邦法规强制要求医院开放 API**。

---

## 1. 为什么医院必须开放 FHIR API？

### 美国法规背景

**21st Century Cures Act（2016 年签署，2020 年 ONC 发布 Final Rule）** 是关键驱动力：

| 法规 | 要求 |
|------|------|
| **21st Century Cures Act** | 禁止"信息阻断"（Information Blocking），要求医疗机构不得阻止患者访问自己的健康数据 |
| **ONC Cures Act Final Rule (2020)** | 认证的 EHR 系统必须支持标准化 API（即 FHIR R4），供患者和第三方应用访问数据 |
| **CMS Interoperability Rule** | Medicare/Medicaid 参与的医院和保险公司必须提供 Patient Access API（基于 FHIR） |
| **USCDI（US Core Data for Interoperability）** | 定义了全国统一的最低数据互操作标准，规定哪些数据类别必须通过 FHIR 暴露 |

> 截至 2022 年，约 80% 的美国非联邦急性护理医院已使用 API 允许患者通过应用访问健康信息，约 70% 支持标准化 FHIR API。

### USCDI 强制要求暴露的数据类别

USCDI 从 v1 到 v5 逐步扩展（目前已起草至 v7）。以下是核心数据类别：

| 数据类别 | 包含内容 | FHIR Resource |
|---------|---------|---------------|
| **过敏与不耐受** | 药物过敏、食物过敏、反应 | `AllergyIntolerance` |
| **用药列表** | 当前/历史用药、给药途径（v5 新增） | `MedicationRequest`, `MedicationStatement` |
| **实验室检查结果** | 血检、尿检、代谢面板等 | `Observation` (laboratory) |
| **生命体征** | 血压、心率、体温、SpO2、BMI、体重、身高 | `Observation` (vital-signs) |
| **诊断/健康状况** | 疾病诊断、ICD-10 编码 | `Condition` |
| **手术/操作** | 手术记录、操作历史 | `Procedure` |
| **免疫接种** | 疫苗记录、批号（v5 新增） | `Immunization` |
| **临床笔记** | 出院小结、门诊记录、护理记录、急诊记录（v5 新增）、手术记录（v5 新增） | `DocumentReference` |
| **患者人口统计** | 姓名、生日、性别、种族、语言、代词（v5 新增） | `Patient` |
| **护理团队** | 主治医生、护理人员 | `CareTeam` |
| **评估与计划** | 治疗计划、出院计划 | `CarePlan` |
| **医嘱**（v5 新增） | 药物医嘱、检验医嘱、影像医嘱、手术医嘱 | `ServiceRequest`, `MedicationRequest` |
| **来源信息** | 数据作者、作者角色（v5 新增） | `Provenance` |

> 参考：[USCDI 官方页面](https://isp.healthit.gov/united-states-core-data-interoperability-uscdi)

---

## 2. 主要 EHR 系统的 FHIR 支持

美国医院使用的 EHR 系统集中在几大厂商：

| EHR 厂商 | 市场份额 | FHIR 文档 | 患者门户 |
|----------|---------|----------|---------|
| **Epic** | ~38% 美国医院 | [fhir.epic.com](https://fhir.epic.com/) | MyChart |
| **Oracle Health (Cerner)** | ~25% | [fhir.cerner.com](https://fhir.cerner.com/) | Patient Portal |
| **MEDITECH** | ~16% | MEDITECH Expanse FHIR API | Patient & Consumer Portal |
| **Veradigm (Allscripts)** | ~5% | [developer.veradigm.com](https://developer.veradigm.com/Fhir/SMARTonFHIR) | FollowMyHealth |
| **athenahealth** | ~5% | athenahealth FHIR API | athenaPatient |

### 如何发现医院的 FHIR 端点？

**ONC Lantern** 是美国政府维护的 FHIR 端点目录：
- 地址：[lantern.healthit.gov](https://lantern.healthit.gov/?tab=endpoints_tab)
- 收录了全美已认证的 FHIR API 端点
- 可按 EHR 厂商、医院名称、州搜索
- 监控端点可用性（uptime）和 FHIR 合规性

每个认证 EHR 厂商也必须公开其端点列表（ONC 法规要求）：
- Epic 端点列表：[open.epic.com/MyApps/Endpoints](https://open.epic.com/MyApps/Endpoints)
- Cerner 端点列表：通过 Cerner code console 查询

---

## 3. 患者数据获取的完整流程

### 3.1 从患者视角看（以 Apple Health Records 为例）

Apple Health 是目前最成功的 FHIR 患者数据聚合应用之一，已接入 500+ 家医院。用户体验如下：

```
1. 打开 iPhone「健康」App → 点击「健康记录」
2. 搜索并选择自己的医院（如 "Johns Hopkins", "NYP"）
3. 跳转到该医院的 MyChart / 患者门户登录页
4. 输入患者门户的用户名和密码
5. 审查并授权 Apple Health 访问的数据范围
6. 点击「允许」→ 数据自动拉取到手机
7. 之后定期自动同步，有新数据时推送通知
```

**关键点**：患者必须拥有该医院的**患者门户账号**（如 MyChart 账号），这是身份验证的基础。

### 3.2 从技术视角看（SMART on FHIR Standalone Launch）

```
┌──────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│  你的 App  │────→│ FHIR 发现服务  │────→│ 授权服务器(OAuth)│────→│ FHIR 资源服务器│
└──────────┘     └──────────────┘     └────────────────┘     └──────────────┘
```

**Step 1: 发现（Discovery）**

向医院的 FHIR Base URL 请求配置元数据：

```
GET https://fhir.hospital.org/api/FHIR/R4/.well-known/smart-configuration
```

返回：

```json
{
  "authorization_endpoint": "https://fhir.hospital.org/oauth2/authorize",
  "token_endpoint": "https://fhir.hospital.org/oauth2/token",
  "capabilities": [
    "launch-standalone",
    "client-public",
    "client-confidential-symmetric",
    "permission-patient",
    "permission-v2"
  ],
  "scopes_supported": [
    "patient/Patient.read",
    "patient/Observation.read",
    "patient/Condition.read",
    "patient/MedicationRequest.read",
    "launch/patient",
    "openid",
    "fhirUser"
  ]
}
```

**Step 2: 授权请求（Authorization Request）**

将用户重定向到医院的授权端点：

```
GET https://fhir.hospital.org/oauth2/authorize?
  response_type=code
  &client_id=YOUR_APP_CLIENT_ID
  &redirect_uri=http://localhost:3001/api/v1/oauth/fhir/callback
  &scope=launch/patient patient/Patient.read patient/Observation.read patient/Condition.read patient/MedicationRequest.read openid fhirUser
  &state=random_csrf_token
  &aud=https://fhir.hospital.org/api/FHIR/R4
```

**Step 3: 用户登录 & 授权**

用户在医院的患者门户登录页面：
- 输入 MyChart / 患者门户用户名密码
- 查看 App 请求的数据权限
- 点击「授权」或「允许」

**Step 4: 回调 & 换 Token**

医院重定向回你的 App，附带 authorization code：

```
GET http://localhost:3001/api/v1/oauth/fhir/callback?code=AUTH_CODE&state=random_csrf_token
```

用 code 换取 access_token：

```http
POST https://fhir.hospital.org/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=AUTH_CODE
&redirect_uri=http://localhost:3001/api/v1/oauth/fhir/callback
&client_id=YOUR_APP_CLIENT_ID
&client_secret=YOUR_APP_CLIENT_SECRET
```

返回：

```json
{
  "access_token": "eyJhbGciOiJSUzI...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIH...",
  "scope": "patient/Patient.read patient/Observation.read ...",
  "patient": "Patient/abc123"  // ← SMART 特有：返回当前患者 ID
}
```

**Step 5: 用 Token 查询 FHIR 数据**

```http
# 获取患者基本信息
GET https://fhir.hospital.org/api/FHIR/R4/Patient/abc123
Authorization: Bearer eyJhbGciOiJSUzI...

# 获取实验室检查结果
GET https://fhir.hospital.org/api/FHIR/R4/Observation?patient=abc123&category=laboratory
Authorization: Bearer eyJhbGciOiJSUzI...

# 获取用药列表
GET https://fhir.hospital.org/api/FHIR/R4/MedicationRequest?patient=abc123
Authorization: Bearer eyJhbGciOiJSUzI...

# 获取诊断
GET https://fhir.hospital.org/api/FHIR/R4/Condition?patient=abc123
Authorization: Bearer eyJhbGciOiJSUzI...
```

**Step 6: Token 刷新**

Access token 过期后用 refresh_token 刷新（与 Fitbit/Oura 的 OAuth 流程完全一致）：

```http
POST https://fhir.hospital.org/oauth2/token

grant_type=refresh_token
&refresh_token=dGhpcyBpcyBhIH...
&client_id=YOUR_APP_CLIENT_ID
```

---

## 4. SMART Scopes 详解（权限控制）

SMART on FHIR 使用自定义 scope 语法，精确控制数据访问范围：

```
{context}/{resource_type}.{interaction}
```

| Scope | 含义 |
|-------|------|
| `patient/Patient.read` | 读取当前患者的 Patient 资源 |
| `patient/Observation.read` | 读取患者的观测数据（生命体征、检验结果） |
| `patient/Observation.rs` | 读取 + 搜索患者的观测数据 |
| `patient/Condition.read` | 读取患者的诊断/健康状况 |
| `patient/MedicationRequest.read` | 读取患者的用药处方 |
| `patient/AllergyIntolerance.read` | 读取患者的过敏信息 |
| `patient/Immunization.read` | 读取患者的免疫接种记录 |
| `patient/Procedure.read` | 读取患者的手术/操作记录 |
| `patient/DocumentReference.read` | 读取临床文档（出院小结等） |
| `launch/patient` | 请求患者上下文（Standalone Launch 必须） |
| `openid fhirUser` | 获取用户身份信息 |

**context 类型**：
- `patient/` — 患者授权，只能访问该患者自己的数据
- `user/` — 用户级别（医生等），可访问其权限范围内的多个患者
- `system/` — 系统级别（Backend Service），服务端到服务端

---

## 5. 两种获取模式对比

### 模式 A：Patient-Facing（患者授权）

```
用户 → 你的 App → 医院 OAuth 授权页 → 用户登录 MyChart → 授权 → 拉数据
```

- 使用 **Authorization Code Grant**
- 适合：患者主动连接自己的医院
- 类比：等同于你现有的 Fitbit / Oura OAuth 流程
- 需要：在 EHR 厂商注册为 Patient-Facing App

### 模式 B：Backend Service（系统对系统）

```
你的服务器 → JWT 签名 → 医院 Token 端点 → Access Token → 拉数据
```

- 使用 **Client Credentials + JWT Assertion**（RS384 签名）
- 适合：数据管道、批量数据处理、不需要用户在线
- 需要：与医院/EHR 厂商签订数据使用协议，注册 JWKS 公钥
- Scope 使用 `system/` 前缀

### 选择建议

| 场景 | 推荐模式 |
|------|---------|
| 用户在 Web 界面点击"连接我的医院" | Patient-Facing (模式 A) |
| 研究项目批量拉取脱敏数据 | Backend Service (模式 B) |
| 两者都要 | 先实现 A（与现有 OAuth 架构一致），后续加 B |

---

## 6. App 注册流程（以 Epic 为例）

要接入 Epic 的 FHIR API，需要以下步骤：

### Step 1: 注册开发者账号
- 前往 [open.epic.com](https://open.epic.com/) 注册
- 创建一个 App

### Step 2: 配置 App
- 选择 App 类型：**Patient-Facing** 或 **Clinician-Facing** 或 **Backend System**
- 填写 Redirect URI（如 `http://localhost:3001/api/v1/oauth/fhir/callback`）
- 选择需要的 FHIR Resources 和 Scopes
- 填写隐私政策、数据使用声明

### Step 3: 沙箱测试
- Epic 提供沙箱环境（带测试患者数据）
- 在沙箱中完成 OAuth 流程和数据查询测试

### Step 4: 提交审核
- 填写 App 问卷：资金来源、是否分发数据、用户能否删除数据等
- Epic 审核（可能需要数周）

### Step 5: 上线
- 审核通过后，App 可连接所有使用 Epic 的医院
- 用户通过 MyChart 凭据授权

> 注意：每个 EHR 厂商有自己的注册流程。Epic 的优势是注册一次即可连接所有 Epic 医院（~38% 美国医院）。

---

## 7. 返回数据示例

### 患者基本信息 (`Patient`)

```json
{
  "resourceType": "Patient",
  "id": "abc123",
  "name": [{"family": "Smith", "given": ["John"]}],
  "birthDate": "1990-05-15",
  "gender": "male",
  "address": [{"city": "New York", "state": "NY"}]
}
```

### 实验室结果 (`Observation` - laboratory)

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [{"coding": [{"code": "laboratory"}]}],
  "code": {
    "coding": [{"system": "http://loinc.org", "code": "2093-3", "display": "Total Cholesterol"}]
  },
  "subject": {"reference": "Patient/abc123"},
  "effectiveDateTime": "2025-03-15T10:30:00Z",
  "valueQuantity": {"value": 195, "unit": "mg/dL"}
}
```

### 用药 (`MedicationRequest`)

```json
{
  "resourceType": "MedicationRequest",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "coding": [{"system": "http://www.nlm.nih.gov/research/umls/rxnorm", "code": "197361", "display": "Lisinopril 10 MG"}]
  },
  "subject": {"reference": "Patient/abc123"},
  "dosageInstruction": [{"text": "Take 1 tablet by mouth daily"}]
}
```

### 诊断 (`Condition`)

```json
{
  "resourceType": "Condition",
  "clinicalStatus": {"coding": [{"code": "active"}]},
  "code": {
    "coding": [{"system": "http://hl7.org/fhir/sid/icd-10-cm", "code": "I10", "display": "Essential Hypertension"}]
  },
  "subject": {"reference": "Patient/abc123"},
  "onsetDateTime": "2023-06-01"
}
```

---

## 8. 用户 Workflow：三条路径获取医院数据

用户获取自己医院数据有三条路径，按实现难度从低到高排列：

### Path A：通过 Apple Health 导出（最快落地 ⚡）

**前提**：用户已在 iPhone「健康」App 中连接了自己的医院。

Apple Health 的 `export.zip` 中包含 `ClinicalRecord` 元素 — 这些就是用户从医院拉过来的 FHIR 数据（检验、用药、诊断、过敏、免疫、生命体征等），以 FHIR R4 JSON 嵌入在 XML 中。

```
用户 Workflow:
─────────────
1. iPhone「健康」App → 已连接医院（MyChart 等）      ← 用户之前已完成
2. iPhone「健康」App → 右上角头像 → 导出所有健康数据   ← 生成 export.zip
3. 打开我们的 Dashboard → 上传页面
4. 选择设备类型: "Apple Health"
5. 上传 export.zip
6. 系统自动解析:
   - HKQuantityTypeIdentifier* → 可穿戴数据（心率、步数、SpO2...）  ← 已实现 ✅
   - ClinicalRecord            → 医院临床数据（检验、用药、诊断...）  ← 需要增强 ⚠️
7. 数据全部存入 raw_payloads (JSONB)
```

**需要改动**：增强 `apple_health.py` collector，增加对 `ClinicalRecord` XML 元素的解析：

```xml
<!-- Apple Health export.xml 中的临床记录长这样 -->
<ClinicalRecord
  type="ClinicalRecord"
  identifier="..."
  sourceName="NYP/Columbia"
  sourceURL="https://epicmychart.nyp.org/..."
  fhirVersion="4.0.1"
  receivedDate="2025-01-15"
  resourceFilePath="clinical-records/Observation_12345.json">
</ClinicalRecord>

<!-- 对应的 FHIR JSON 在 clinical-records/ 目录下 -->
```

```
export.zip 解压后的结构:
├── apple_health_export/
│   ├── export.xml                    ← 主文件（Record, Workout, ClinicalRecord）
│   └── clinical-records/             ← FHIR JSON 文件目录
│       ├── Observation_12345.json    ← 检验结果
│       ├── Condition_67890.json      ← 诊断
│       ├── MedicationRequest_xxx.json← 用药
│       ├── Immunization_yyy.json     ← 免疫
│       ├── AllergyIntolerance_zzz.json ← 过敏
│       └── Procedure_www.json        ← 手术记录
```

**优点**：
- 用户已经知道怎么从 iPhone 导出（很多人已经连好了医院）
- 不需要我们注册 Epic/Cerner App（Apple 已经做了这一步）
- 不需要 OAuth 流程 — 就是文件上传
- 一次上传同时获得可穿戴 + 临床数据

**缺点**：
- 只有 iPhone 用户可用
- 数据不会自动同步（需要用户手动重新导出）
- 取决于用户是否在 iPhone 上连接了医院

**实现工作量**：~100 行 Python（在现有 `apple_health.py` 中增加 `ClinicalRecord` 解析 + 读取 `clinical-records/` 目录的 FHIR JSON）

---

### Path B：患者门户手动导出上传（中等难度 🔧）

**前提**：用户能登录自己的医院患者门户（MyChart, Patient Portal 等）。

大多数患者门户允许用户下载自己的健康记录，通常格式为：
- **C-CDA XML**（Consolidated Clinical Document Architecture）— 最常见的导出格式
- **FHIR Bundle JSON** — 部分现代门户支持
- **PDF** — 人类可读但无法结构化解析

```
用户 Workflow:
─────────────
1. 登录医院患者门户 (如 MyChart)
2. 找到「下载我的健康记录」/ "Download My Health Records" / "Share My Record"
   - MyChart: Menu → Sharing Hub → Download My Data
   - 选择格式: 通常是 C-CDA XML 或 FHIR JSON
   - 选择日期范围
3. 下载文件 (如 patient_records.xml 或 fhir_bundle.json)
4. 打开我们的 Dashboard → 上传页面
5. 选择设备类型: "Hospital Records (FHIR/C-CDA)"
6. 上传文件
7. 系统解析:
   - FHIR Bundle JSON → 直接拆分为 RawPayload per Resource Type
   - C-CDA XML → 解析 → 转换为结构化 JSON → RawPayload
8. 数据存入 raw_payloads (JSONB)
```

**需要新建**：`collectors/hospital_records.py`（文件上传类型的 collector）

```python
# 伪代码
class HospitalRecordsCollector(BaseCollector):
    device_type = "hospital_records"

    async def collect(self, file_path, user_id, **kwargs):
        if file_path.endswith('.json'):
            return self._parse_fhir_bundle(file_path, user_id)
        elif file_path.endswith('.xml'):
            return self._parse_ccda(file_path, user_id)
```

**优点**：
- 不需要注册 Epic/Cerner App
- Android 和 iPhone 用户都可用
- 几乎所有美国医院的患者门户都支持数据导出（法律要求）

**缺点**：
- 手动流程（用户需要自己找到导出功能，可能不直观）
- 不同门户的导出格式/步骤不同
- 不会自动同步
- C-CDA 解析比 FHIR JSON 复杂

**实现工作量**：~300-500 行 Python（FHIR Bundle 解析简单；C-CDA XML 解析较复杂，可用 `python-ccda` 库）

---

### Path C：直接 SMART on FHIR OAuth 连接（最完整 🏗️）

**前提**：我们的 App 已在 Epic/Cerner 等 EHR 厂商注册并通过审核。

这是最完整的方案 — 用户在我们的 Dashboard 中直接连接医院，类似连接 Fitbit/Oura 的体验。

```
用户 Workflow:
─────────────
1. 打开我们的 Dashboard → Devices 页面
2. 找到 "Hospital Records" 卡片 → 点击「Connect Hospital」
3. 搜索自己的医院:
   ┌────────────────────────────────────────────────┐
   │  🔍  Search your hospital...                   │
   │                                                │
   │  🏥 NewYork-Presbyterian / Columbia            │
   │     Epic MyChart · FHIR R4                     │
   │     [Connect]                                  │
   │                                                │
   │  🏥 NYU Langone Health                         │
   │     Epic MyChart · FHIR R4                     │
   │     [Connect]                                  │
   │                                                │
   │  🏥 Johns Hopkins Hospital                     │
   │     Epic MyChart · FHIR R4                     │
   │     [Connect]                                  │
   │                                                │
   │  🏥 Mount Sinai Health System                  │
   │     Epic MyChart · FHIR R4                     │
   │     [Connect]                                  │
   └────────────────────────────────────────────────┘

4. 点击「Connect」→ 跳转到该医院的 MyChart 登录页
   ┌────────────────────────────────────────────────┐
   │         NYP MyChart Login                       │
   │                                                │
   │  Username: [________________]                  │
   │  Password: [________________]                  │
   │                                                │
   │            [Sign In]                           │
   └────────────────────────────────────────────────┘

5. 登录后 → 授权页面
   ┌────────────────────────────────────────────────┐
   │  "Wearable Data Pipeline" requests access to:  │
   │                                                │
   │   ✅ Lab Results                               │
   │   ✅ Medications                               │
   │   ✅ Conditions & Diagnoses                    │
   │   ✅ Vital Signs                               │
   │   ✅ Allergies                                 │
   │   ✅ Immunizations                             │
   │   ✅ Procedures                                │
   │   ✅ Clinical Notes                            │
   │                                                │
   │   [Allow]          [Deny]                      │
   └────────────────────────────────────────────────┘

6. 点击「Allow」→ 自动回调到我们的系统
7. 系统自动拉取该医院的所有 FHIR Resources
8. 之后 Cron 定期自动同步新数据（如新的检验结果）

已连接状态:
   ┌────────────────────────────────────────────────┐
   │  🏥 Hospital Records                           │
   │                                                │
   │  ✅ NYP/Columbia    Last sync: 2 hours ago     │
   │     Patient, 45 Observations, 3 Conditions,    │
   │     5 Medications, 8 Immunizations             │
   │     [Sync Now] [Disconnect]                    │
   │                                                │
   │  ✅ NYU Langone     Last sync: 1 day ago       │
   │     Patient, 23 Observations, 1 Condition      │
   │     [Sync Now] [Disconnect]                    │
   │                                                │
   │  + Connect Another Hospital                    │
   └────────────────────────────────────────────────┘
```

**优点**：
- 最好的用户体验 — 和连接 Fitbit 一样简单
- 自动同步 — 新的检验结果会自动拉取
- 可连接多家医院
- 数据最完整、最新

**缺点**：
- 需要在 Epic、Cerner 等厂商注册 App（审核周期数周到数月）
- 需要隐私政策、数据使用声明等合规文件
- 开发工作量最大
- 不同医院的 FHIR 实现可能有差异

**实现工作量**：~800-1000 行 Python + 前端医院选择器 UI

---

### 推荐实施顺序

```
Phase 1 (立即可做):  Path A — 增强 Apple Health collector 解析 ClinicalRecord
                     工作量: 1-2 天
                     覆盖: iPhone 用户 + 已连接医院的用户

Phase 2 (短期):      Path B — 新建 hospital_records collector 支持 C-CDA/FHIR 文件上传
                     工作量: 3-5 天
                     覆盖: 所有用户（手动导出）

Phase 3 (中期):      Path C — SMART on FHIR OAuth 直连
                     工作量: 2-3 周（含 Epic 注册审核等待时间）
                     覆盖: 所有用户（自动同步）
```

**建议**：先做 Path A，因为你的 Apple Health collector 已经存在，只需增加 ~100 行代码就能解锁医院数据。同时开始 Epic App 注册流程（审核需要时间），等审核通过再实现 Path C。

---

## 9. 三条路径的对比总结

| 维度 | Path A: Apple Health 导出 | Path B: 门户手动导出 | Path C: SMART on FHIR OAuth |
|------|--------------------------|--------------------|-----------------------------|
| **用户操作** | iPhone 导出 zip → 上传 | 登录门户 → 下载 → 上传 | 搜索医院 → 登录 → 授权（一次） |
| **自动同步** | ❌ 手动重新导出 | ❌ 手动重新下载 | ✅ Cron 自动拉取 |
| **覆盖用户** | iPhone 用户 | 所有有门户账号的用户 | 所有有门户账号的用户 |
| **数据格式** | FHIR JSON（嵌入 XML） | C-CDA XML 或 FHIR JSON | FHIR JSON（Bundle） |
| **我方注册** | 不需要 | 不需要 | 需要注册 Epic/Cerner App |
| **实现复杂度** | 低（增强现有 collector） | 中（新建 collector + C-CDA 解析） | 高（OAuth + 动态端点 + 分页 + UI） |
| **工作量** | 1-2 天 | 3-5 天 | 2-3 周 |
| **数据新鲜度** | 导出时的快照 | 导出时的快照 | 实时（每次 sync 拉最新） |

---

## 10. 与我们的数据管道集成方案

我们的可穿戴数据管道已有完善的 OAuth + JSONB 架构，FHIR 可以作为一个新的数据源无缝接入：

### 架构适配

```
现有架构                           FHIR 扩展
─────────                         ──────────
Fitbit OAuth  ──→ collector ──→   FHIR OAuth (SMART on FHIR) ──→ fhir collector ──→
Oura OAuth    ──→ collector ──→   同样的 OAuth 2.0 流程          同样的 RawPayload
Google Fit    ──→ collector ──→                                  同样的 JSONB 存储
                      ↓                                               ↓
              raw_payloads (JSONB)                            raw_payloads (JSONB)
```

### 需要新增的内容

| 组件 | 文件 | 说明 |
|------|------|------|
| Collector | `collectors/fhir.py` | 遍历 Observation, Condition, MedicationRequest 等资源 |
| OAuth 配置 | `oauth/manager.py` | 增加 FHIR 的 authorize/token URL（动态，来自 .well-known） |
| 数据库 seed | `db/schema.sql` | devices 表增加 `fhir` 记录 |
| 环境变量 | `.env` | `FHIR_BASE_URL`, `FHIR_CLIENT_ID`, `FHIR_CLIENT_SECRET` |
| 前端 | Dashboard | 新增 FHIR 设备卡片，支持选择医院 |

### 核心差异

FHIR 与 Fitbit/Oura 的 OAuth 流程 95% 相同，主要差异：

1. **端点不固定** — 每家医院有不同的 FHIR Base URL，需要动态发现（`.well-known/smart-configuration`）
2. **Scope 语法不同** — 使用 FHIR 特有的 `patient/Resource.read` 格式
3. **返回数据格式** — FHIR Bundle（分页的资源集合），而不是设备厂商的自定义 JSON
4. **多机构** — 一个用户可能连接多家医院，需要支持多个 FHIR 端点

---

## 11. 推荐的 Python 库

| 库 | 用途 | 与我们架构的适配度 |
|----|------|-----------------|
| **`fhirpy`** | 异步 FHIR 客户端，查询/CRUD | 最高 — 原生 async，与我们的 asyncio 架构一致 |
| **`fhir.resources`** | Pydantic v2 数据模型 + 验证 | 高 — 用于解析和验证 FHIR JSON |
| **`httpx`** | HTTP 客户端（已在项目中使用） | 高 — 可直接用现有 httpx 发请求 |
| **`fhirclient`** | SMART on FHIR 官方客户端 | 中 — 同步为主，但封装了完整 SMART 流程 |

---

## 12. 挑战与注意事项

| 挑战 | 说明 |
|------|------|
| **端点碎片化** | 美国约有 6000+ 家医院，每家的 FHIR 实现细节可能不同 |
| **App 审核周期** | Epic、Cerner 等厂商的审核可能需要数周到数月 |
| **数据覆盖不完整** | 不是所有临床数据都通过 FHIR 暴露（如影像、基因组数据可能不在 USCDI 中） |
| **速率限制** | 各医院 FHIR 服务器有不同的速率限制策略 |
| **国际适用性** | USCDI 和 Cures Act 是美国法规；其他国家有不同标准（如澳大利亚 My Health Record、英国 NHS Digital） |
| **Refresh Token 策略** | 部分医院的 refresh token 有效期较短（如 90 天），需要用户重新授权 |

---

## 参考资料

- [SMART on FHIR 官方文档](https://docs.smarthealthit.org/)
- [SMART App Launch v2.2.0 规范](https://build.fhir.org/ig/HL7/smart-app-launch/app-launch.html)
- [HL7 FHIR SMART App Launch](https://www.hl7.org/fhir/smart-app-launch/)
- [Epic on FHIR 开发者门户](https://fhir.epic.com/)
- [Epic 端点列表](https://open.epic.com/MyApps/Endpoints)
- [Cerner SMART on FHIR 教程](https://engineering.cerner.com/smart-on-fhir-tutorial/)
- [ONC Lantern FHIR 端点目录](https://lantern.healthit.gov/?tab=endpoints_tab)
- [USCDI 官方页面](https://isp.healthit.gov/united-states-core-data-interoperability-uscdi)
- [CMS Patient Access API FAQ](https://www.cms.gov/priorities/burden-reduction/overview/interoperability/frequently-asked-questions/patient-access-api)
- [21st Century Cures Act Final Rule](https://www.federalregister.gov/documents/2020/05/01/2020-07419/21st-century-cures-act-interoperability-information-blocking-and-the-onc-health-it-certification)
- [Apple Health Records 与 FHIR 集成](https://rhapsody.health/blog/apple-health-fhir/)
- [Google Cloud Healthcare API SMART on FHIR](https://docs.cloud.google.com/healthcare-api/docs/smart-on-fhir)
- [Azure SMART on FHIR](https://learn.microsoft.com/en-us/azure/healthcare-apis/fhir/smart-on-fhir)
