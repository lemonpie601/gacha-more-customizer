# Gacha More Customizer · 픽업 인원 (비공식)

[Gacha Forge Customizer](https://github.com/tlsiddl/gacha-forge-customizer)에 얹어 쓰는 **추가 패치**입니다. Gacha Forge **1.8.13** 픽업 배너의 신규 인원을 **월드마다** 정할 수 있게 합니다.

> 원본 Gacha Forge·Gacha Forge Customizer와 무관한 팬 제작 확장입니다. 커스터마이저가 없으면 동작하지 않습니다.

## 기능

| 설정 | 범위 | 기본 |
|---|---|---|
| 픽업 5성 인원 | 1~3명 | 1명 (게임 기본) |
| 픽업 4성 인원 | 1~6명 | 1명 (게임 기본) |

- 게임 **설정 → 커스터마이저** 화면 안, 커스터마이저의 [되돌리기]·[서버에 적용] 줄 **밑에** **[픽업 인원]** 판이 하나 더 생깁니다. 저장 버튼은 판 안에 따로 있습니다 (커스터마이저 설정과 따로 저장).
- 지금 열린 월드에만 저장됩니다. 월드마다 다르게 둘 수 있습니다.
- 인원을 늘리면, 그 월드에서 소환 탭을 열 때 **지금 배너에도** 모자란 인원만 새로 만듭니다 (LLM 1회 + 초상화). 새 배너도 같은 방식으로 채워집니다. 실패하면 원래 배너로 동작하고 10분 뒤 다시 시도합니다.
- 인원을 줄이면 남는 인원은 픽업에서 빠지기만 하고 지워지지 않습니다. 다시 늘리면 새로 만들지 않고 그대로 돌아옵니다.
- 5성 픽업: 픽업 5성들 중 같은 확률로 나옵니다 (커스터마이저의 픽업 5성 확정과 함께 동작).
- 4성 픽업: 신규 4성과 복각 4성이 같은 확률로 나옵니다. 배너 상세의 확률 표시도 그에 맞게 바뀝니다.
- 무기 배너: 추가 5성마다 전용 5성 무기, 생성할 때마다 4성 무기 1개가 붙습니다.
- 배너가 끝나면 추가 인원도 상시 풀로 들어가고, 커스터마이저의 Glimmer 교환 목록에도 포함됩니다.

## 구성

| 파일 | 역할 |
|---|---|
| `manifest.json`, `extension.js` | **확장** — 커스터마이저 설정 화면 안에 [픽업 인원] 판을 추가합니다 |
| `server/gf-featured-runtime.cjs`, `server/gf-featured-edits.json` | **서버 추가 패치** — 커스터마이저 패치가 고친 Gacha Forge 서버 코드를 메모리 안에서만 한 번 더 고칩니다. 게임 파일은 수정하지 않습니다 |
| `tools/build_addon.py` | `gf-featured-edits.json` 생성기 (설치에는 필요 없음) |

설정은 커스터마이저 설정 파일과 같은 폴더의 `gacha-featured-counts.json`에 월드 ID별로 저장됩니다 (`GF_FEATURED_CONFIG_FILE`로 바꿀 수 있음).

## 요구 사항

- Marinara Engine 2.5.1, Gacha Forge 1.8.13
- [Gacha Forge Customizer](https://github.com/tlsiddl/gacha-forge-customizer)의 **1.8.13용 서버 패치**(`versions/gf1813/`, 14 edits)와 **확장**
- Node 22.15 이상 (`module.registerHooks`)

## 설치

### 1. 확장

GitHub 확장 관리자에 이 저장소 주소를 넣거나, `manifest.json`·`extension.js`를 개인 확장으로 가져옵니다. 게임 화면 안에 들어가야 해서 **Full page access** 권한을 씁니다.

```
https://github.com/lemonpie601/gacha-more-customizer
```

### 2. 서버 추가 패치

`server/` 두 파일을 같은 폴더에 두고 `NODE_OPTIONS`에 추가합니다. **반드시 커스터마이저의 `--require` 바로 뒤에** 넣어야 합니다. 나중에 등록된 훅이 앞 훅의 결과를 받아 고치기 때문에, 순서가 바뀌면 이 패치는 스스로 꺼지고 게임은 원래대로 동작합니다.

**Windows / 직접 실행 (`.env`)**

```
NODE_OPTIONS=... --require=C:/경로/gf-customizer/gf-customizer-runtime.cjs --require=C:/경로/gf-featured-addon/gf-featured-runtime.cjs ...
GF_FEATURED_EDITS_PATH=C:/경로/gf-featured-addon/gf-featured-edits.json
```

`GF_FEATURED_EDITS_PATH`를 비우면 런타임과 같은 폴더의 `gf-featured-edits.json`을 씁니다.

**Docker Compose** (커스터마이저 추가 파일에 이어서)

```yaml
services:
  marinara:
    volumes:
      - ./gf-featured-addon/gf-featured-runtime.cjs:/app/gf-featured-runtime.cjs:ro
      - ./gf-featured-addon/gf-featured-edits.json:/app/gf-featured-edits.json:ro
    environment:
      NODE_OPTIONS: "--require=/app/gf-customizer-runtime.cjs --require=/app/gf-featured-runtime.cjs"
      GF_FEATURED_EDITS_PATH: "/app/gf-featured-edits.json"
```

### 3. 확인

마리나라를 다시 시작하고 로그에서 아래 두 줄을 확인합니다.

```
[gf-customizer] applied 14 edits in memory ...
[gf-featured] applied 14 edits in memory (per-world featured rate-up size)
```

`[gf-featured] not applied: customizer patch not applied`가 보이면 `NODE_OPTIONS` 순서를 확인하세요.

## 호환성

- tlsiddl/gacha-forge-customizer `versions/gf1813` (2026-10-26, `a2f6982`)의 서버 패치·확장과 함께 확인했습니다. 저장소 루트(1.8.12)에 들어간 설정 저장 오류 구분·`DATA_DIR` 기본 경로 변경이 1.8.13용에도 들어오는 경우까지 대비해 두었습니다.
- 다른 in-memory 훅(Gacha Choice, CG, 챕터 가드, 한국어 스탠딩 등)과 함께 로드해 모두 적용되는 것을 확인했습니다. 설치 파일을 직접 고치는 패치(예: gacha-more-money)가 먼저 적용돼 있어도 동작합니다.
- 고칠 자리를 하나라도 찾지 못하면 아무것도 바꾸지 않습니다.

## 끄기

- 추가 생성만 멈추기: 환경 변수 `GF_FEATURED_EXTRA_RATEUP=0`
- 완전히 끄기: `NODE_OPTIONS`에서 `gf-featured-runtime.cjs` 줄을 빼고 재시작. 이미 만든 인원은 남지만 픽업에는 원래 2명만 나옵니다 (지난 배너의 추가 인원은 상시 풀에 남지 않습니다).
