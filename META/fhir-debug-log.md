# FHIR Integration Debug Log

## Issue: `invalid_client` on Epic Token Exchange (2026-03-25 ~ 03-26)

### Symptom
OAuth authorize flow works (user can log in via MyChart), but the token exchange (`POST /oauth2/token`) always returns:
```json
{"error": "invalid_client", "error_description": null}
```

### Root Cause (found 2026-03-26)
**httpx 的 `data=` 参数没有正确 URL 编码 `client_secret` 中的特殊字符（`+`, `=`, `/`）。**

Epic 生成的 client_secret 是 base64 格式，包含 `+`, `/`, `=` 字符：
```
Vc1AlJned4XeP186yZPq+aO0g2WlaqdXYaoyvzB83y3Ap8ZkjREn+5yhThMumVc+J99E0tYvd0XyIrR4VrRqcg==
```

当使用 httpx 的 `data=dict` 参数时，这些特殊字符没有被正确编码为 `%2B`, `%3D`, `%2F`，导致 Epic 收到的 secret 值与存储的哈希不匹配 → `invalid_client`。

**验证**：使用 curl 的 `--data-urlencode` 发送相同请求 → 成功拿到 access_token。

### Fix
将 httpx 的 `data=dict` 改为 `content=urlencode(params)` 手动编码：

```python
# Before (broken):
resp = await client.post(url, data={"client_secret": secret, ...}, headers=headers)

# After (fixed):
from urllib.parse import urlencode
body = urlencode({"client_secret": secret, ...})
resp = await client.post(url, content=body, headers=headers)
```

### Other Issues Encountered

#### 1. Store Hash not clicked (2026-03-25)
Epic 生成 secret 后需要点 **Store Hash** 按钮保存。前几次生成了 secret 但没点 Store Hash，导致 Epic 端没有存储 secret 的哈希 → 任何 secret 都会被拒绝。

#### 2. Route conflict: `/api/v1/oauth/fhir/callback` (2026-03-25)
FHIR 回调路由 `/api/v1/oauth/fhir/callback` 被 wearable 的通配路由 `/api/v1/oauth/{device_type}/callback` 先匹配，`device_type` 被解析为 `"fhir"`。

Fix: 在 wearable callback handler 中检测 `device_type == "fhir"` 并转发到 FHIR handler。

#### 3. Hyperspace vs MyChart login page (2026-03-25)
Application Audience 被意外改成非 Patients，导致 Epic 显示 Hyperspace（医生端）登录页而不是 MyChart（患者端）。

Fix: 确认 Application Audience = Patients 并等待 Epic 沙箱同步（几小时）。

#### 4. State token expired (2026-03-25)
OAuth state token 有 10 分钟有效期。用户获取 authorize URL 后等太久再登录 → state 过期。

Fix: 生成新 URL 后立即使用。

#### 5. SMART v1 vs v2 scope format (2026-03-25)
Epic 页面上选了 SMART v1，但代码中 scope 用了 v2 格式（`.rs` 而不是 `.read`）。

Fix: scope 改回 SMART v1 格式 `patient/Patient.read`。
